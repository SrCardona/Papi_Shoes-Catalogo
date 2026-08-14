import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  clearSession,
  hasValidSession,
  issueSession,
  lockoutRemainingMinutes,
  registerFailedAttempt,
  resetAttempts,
  safeCompare,
  sha256,
} from '../lib/security';
import { abrirSesion, borraToken, consultaPanel, leeToken } from '../lib/nube';
import { useStore } from './StoreContext';

interface LoginResult {
  ok: boolean;
  message?: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  isChecking: boolean;
  /** Este navegador todavía no tiene PIN: hay que crearlo antes de entrar. */
  needsSetup: boolean;
  /**
   * El servidor tiene el PIN configurado y es él quien valida. Cambia lo que el
   * panel puede prometer: el ingreso sirve en cualquier equipo, el PIN ya no se
   * cambia desde aquí y la sesión autoriza a publicar en la nube.
   */
  validaEnServidor: boolean;
  login: (username: string, pin: string) => Promise<LoginResult>;
  logout: () => void;
  changePin: (currentPin: string, newPin: string) => Promise<LoginResult>;
  setupPin: (pin: string) => Promise<LoginResult>;
}

/** Regla única del formato del PIN, para que login y alta no se contradigan. */
const PIN_FORMAT = /^\d{6,12}$/;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { settings, setSettings, publicarAhora } = useStore();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [validaEnServidor, setValidaEnServidor] = useState(false);

  useEffect(() => {
    let vivo = true;

    void (async () => {
      const [sesionLocal, panel] = await Promise.all([
        hasValidSession(),
        consultaPanel(),
      ]);
      if (!vivo) return;

      const enServidor = Boolean(panel?.validaEnServidor);
      setValidaEnServidor(enServidor);
      /* Con validación en el servidor, una sesión local sin token de escritura ya
         no alcanza: dejaría entrar al panel sin poder guardar nada. */
      setIsAuthenticated(sesionLocal && (!enServidor || Boolean(leeToken())));
      setIsChecking(false);
    })();

    return () => {
      vivo = false;
    };
  }, []);

  /* El código no trae ningún PIN, así que un `adminPinHash` vacío significa
     "primer arranque en este navegador", no "credencial inválida". Cuando el
     servidor valida no hay nada que crear: el PIN ya existe, en Vercel. */
  const needsSetup = !validaEnServidor && settings.adminPinHash === '';

  const setupPin = useCallback(
    async (pin: string): Promise<LoginResult> => {
      if (settings.adminPinHash !== '') {
        return { ok: false, message: 'Ya hay un PIN definido en este navegador.' };
      }
      const clean = pin.trim();
      if (!PIN_FORMAT.test(clean)) {
        return { ok: false, message: 'El PIN debe tener entre 6 y 12 dígitos.' };
      }
      setSettings({ ...settings, adminPinHash: await sha256(clean) });
      resetAttempts();
      await issueSession();
      setIsAuthenticated(true);
      return { ok: true };
    },
    [settings, setSettings],
  );

  const login = useCallback(
    async (username: string, pin: string): Promise<LoginResult> => {
      const locked = lockoutRemainingMinutes();
      if (locked > 0) {
        return {
          ok: false,
          message: `Demasiados intentos fallidos. Vuelve a intentar en ${locked} minuto${locked === 1 ? '' : 's'}.`,
        };
      }

      /* Camino normal del sitio publicado: valida el servidor y devuelve el token
         que autoriza a escribir en la nube. El usuario no entra en la cuenta —no
         es un secreto y el servidor no lo conoce—: lo que protege el panel es el
         PIN. */
      if (validaEnServidor) {
        const remoto = await abrirSesion(pin.trim());
        if (remoto.ok) {
          resetAttempts();
          await issueSession();
          setIsAuthenticated(true);
          // Si este navegador traía cambios sin publicar, ya se pueden subir.
          void publicarAhora();
          return { ok: true };
        }
        if (remoto.servidor) {
          // El servidor decidió. No se cae al control local, que puede tener
          // guardado otro PIN y dejaría entrar con una credencial vieja.
          registerFailedAttempt();
          return { ok: false, message: remoto.mensaje };
        }
        /* El servidor existe pero no está en condiciones de validar (le faltan
           variables). Sigue el control local de siempre. */
      }

      const userOk = safeCompare(
        username.trim().toLowerCase(),
        settings.adminUsername.trim().toLowerCase(),
      );
      const pinOk = safeCompare(await sha256(pin.trim()), settings.adminPinHash);

      if (userOk && pinOk) {
        resetAttempts();
        await issueSession();
        setIsAuthenticated(true);
        return { ok: true };
      }

      const left = registerFailedAttempt();
      return {
        ok: false,
        message:
          left > 0
            ? `Usuario o PIN incorrecto. Te quedan ${left} intento${left === 1 ? '' : 's'}.`
            : 'Acceso bloqueado por 15 minutos tras varios intentos fallidos.',
      };
    },
    [
      settings.adminUsername,
      settings.adminPinHash,
      validaEnServidor,
      publicarAhora,
    ],
  );

  const logout = useCallback(() => {
    clearSession();
    // El token de escritura se va con la sesión: salir tiene que quitar también
    // el permiso de publicar, no solo la vista del panel.
    borraToken();
    setIsAuthenticated(false);
  }, []);

  const changePin = useCallback(
    async (currentPin: string, newPin: string): Promise<LoginResult> => {
      /* Con el PIN en el servidor, cambiarlo aquí sería mentir: el sitio seguiría
         pidiendo el de la variable de entorno. */
      if (validaEnServidor) {
        return {
          ok: false,
          message:
            'El PIN del sitio publicado vive en Vercel. Genera el hash aquí abajo y reemplaza la variable ADMIN_PIN_HASH.',
        };
      }
      const currentOk = safeCompare(
        await sha256(currentPin.trim()),
        settings.adminPinHash,
      );
      if (!currentOk) return { ok: false, message: 'El PIN actual no coincide.' };
      if (!PIN_FORMAT.test(newPin.trim())) {
        return { ok: false, message: 'El nuevo PIN debe tener entre 6 y 12 dígitos.' };
      }
      setSettings({ ...settings, adminPinHash: await sha256(newPin.trim()) });
      return { ok: true, message: 'PIN actualizado. Úsalo en tu próximo ingreso.' };
    },
    [settings, setSettings, validaEnServidor],
  );

  const value = useMemo(
    () => ({
      isAuthenticated,
      isChecking,
      needsSetup,
      validaEnServidor,
      login,
      logout,
      changePin,
      setupPin,
    }),
    [
      isAuthenticated,
      isChecking,
      needsSetup,
      validaEnServidor,
      login,
      logout,
      changePin,
      setupPin,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return ctx;
}
