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

/**
 * En el sitio compilado la única puerta es el servidor.
 *
 * Antes, un despliegue sin variables mostraba la pantalla de "crea tu PIN" a
 * cualquiera que abriera /admin, y ese visitante quedaba dentro del panel en su
 * propio navegador: podía mirar los ajustes y exportarse el catálogo. El control
 * local sigue existiendo, pero solo en desarrollo, donde nadie más llega.
 */
const SOLO_SERVIDOR = !import.meta.env.DEV;

interface AuthContextValue {
  isAuthenticated: boolean;
  isChecking: boolean;
  /** Este navegador todavía no tiene PIN: hay que crearlo antes de entrar. */
  needsSetup: boolean;
  /**
   * No hay forma de entrar: el sitio está publicado y el servidor no puede
   * validar porque le faltan las variables. Es cerrado a propósito, no un fallo.
   */
  panelBloqueado: boolean;
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
      /* Una sesión guardada en este navegador no basta: en el sitio publicado hay
         que tener el token que solo entrega el servidor. Si no, bastaría con
         haber entrado una vez —o con escribir la llave a mano— para seguir
         entrando. */
      const exigeToken = SOLO_SERVIDOR || enServidor;
      setIsAuthenticated(sesionLocal && (!exigeToken || Boolean(leeToken())));
      setIsChecking(false);
    })();

    return () => {
      vivo = false;
    };
  }, []);

  /* El código no trae ningún PIN, así que un `adminPinHash` vacío significa
     "primer arranque en este navegador", no "credencial inválida". Eso solo vale
     en desarrollo: en el sitio publicado el PIN ya existe, en Vercel, y no hay
     nada que crear. */
  const needsSetup =
    !SOLO_SERVIDOR && !validaEnServidor && settings.adminPinHash === '';

  const panelBloqueado = SOLO_SERVIDOR && !validaEnServidor;

  const setupPin = useCallback(
    async (pin: string): Promise<LoginResult> => {
      // Cinturón, además del tirante: la pantalla ni se muestra fuera de desarrollo.
      if (SOLO_SERVIDOR) {
        return {
          ok: false,
          message: 'El PIN del sitio publicado se configura en Vercel, no aquí.',
        };
      }
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

      /* Camino normal del sitio publicado: el servidor compara usuario y PIN, y
         devuelve el token que autoriza a escribir en la nube. */
      if (validaEnServidor) {
        const remoto = await abrirSesion(username, pin.trim());
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

      /* En el sitio publicado no hay control local que valga: cualquier
         credencial guardada en este navegador la puso este navegador, y aceptarla
         sería la misma puerta abierta que se cerró. */
      if (SOLO_SERVIDOR) {
        return {
          ok: false,
          message:
            'El panel está cerrado hasta que el servidor pueda validar. Configura ADMIN_PIN_HASH y ADMIN_SESSION_SECRET en Vercel.',
        };
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
      panelBloqueado,
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
      panelBloqueado,
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
