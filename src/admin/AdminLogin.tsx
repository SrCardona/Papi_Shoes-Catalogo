import { useState } from 'react';
import { AlertCircle, Loader2, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BrandLockup } from '../components/ui/TempleMark';

export function AdminLogin() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const result = await login(username, pin);
    if (!result.ok) {
      setError(result.message ?? 'No se pudo iniciar sesión.');
      setPin('');
    }
    setIsSubmitting(false);
  };

  const field =
    'w-full bg-obsidian border border-white/14 py-3 px-3.5 text-[13px] text-marble placeholder:text-marble/25 focus:outline-none focus:border-silver/50 transition-colors';

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <BrandLockup size="md" className="mb-10" />

        <div className="bg-basalt border border-white/10 p-7">
          <div className="flex items-center gap-2.5 mb-6 pb-5 border-b border-white/8">
            <Lock className="w-4 h-4 text-silver/70" />
            <h1 className="font-display text-lg text-marble">Panel de administración</h1>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-user"
                className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-marble/40 mb-2"
              >
                Usuario
              </label>
              <input
                id="admin-user"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                placeholder="tu.usuario"
                className={field}
                autoFocus
                required
              />
            </div>

            <div>
              <label
                htmlFor="admin-pin"
                className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-marble/40 mb-2"
              >
                PIN
              </label>
              <input
                id="admin-pin"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError(null);
                }}
                placeholder="••••••"
                className={`${field} tracking-[0.35em]`}
                required
              />
            </div>

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 bg-red-950/40 border border-red-500/30 px-3 py-2.5 text-[11.5px] text-red-300 leading-relaxed"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-marble text-obsidian text-[10px] font-bold uppercase tracking-[0.22em] hover:bg-silver disabled:opacity-50 transition-colors mt-2"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isSubmitting ? 'Verificando' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-[11px] leading-relaxed text-marble/30 text-center">
          El acceso se bloquea 15 minutos tras 5 intentos fallidos.
        </p>
      </div>
    </div>
  );
}
