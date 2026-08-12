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
  login: (username: string, pin: string) => Promise<LoginResult>;
  logout: () => void;
  changePin: (currentPin: string, newPin: string) => Promise<LoginResult>;
  setupPin: (pin: string) => Promise<LoginResult>;
}

/** Regla única del formato del PIN, para que login y alta no se contradigan. */
const PIN_FORMAT = /^\d{6,12}$/;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { settings, setSettings } = useStore();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    hasValidSession().then((valid) => {
      setIsAuthenticated(valid);
      setIsChecking(false);
    });
  }, []);

  /* El código no trae ningún PIN, así que un `adminPinHash` vacío significa
     "primer arranque en este navegador", no "credencial inválida". */
  const needsSetup = settings.adminPinHash === '';

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
    [settings.adminUsername, settings.adminPinHash],
  );

  const logout = useCallback(() => {
    clearSession();
    setIsAuthenticated(false);
  }, []);

  const changePin = useCallback(
    async (currentPin: string, newPin: string): Promise<LoginResult> => {
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
    [settings, setSettings],
  );

  const value = useMemo(
    () => ({ isAuthenticated, isChecking, needsSetup, login, logout, changePin, setupPin }),
    [isAuthenticated, isChecking, needsSetup, login, logout, changePin, setupPin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return ctx;
}
