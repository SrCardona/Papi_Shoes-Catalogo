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
  login: (username: string, pin: string) => Promise<LoginResult>;
  logout: () => void;
  changePin: (currentPin: string, newPin: string) => Promise<LoginResult>;
}

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
      if (!/^\d{6,12}$/.test(newPin.trim())) {
        return { ok: false, message: 'El nuevo PIN debe tener entre 6 y 12 dígitos.' };
      }
      setSettings({ ...settings, adminPinHash: await sha256(newPin.trim()) });
      return { ok: true, message: 'PIN actualizado. Úsalo en tu próximo ingreso.' };
    },
    [settings, setSettings],
  );

  const value = useMemo(
    () => ({ isAuthenticated, isChecking, login, logout, changePin }),
    [isAuthenticated, isChecking, login, logout, changePin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return ctx;
}
