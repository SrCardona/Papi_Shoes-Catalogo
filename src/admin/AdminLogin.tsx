import { useState } from 'react';
import { AlertCircle, Loader2, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BrandLockup } from '../components/ui/TempleMark';

export function AdminLogin() {
  const { login, needsSetup, setupPin, validaEnServidor, panelBloqueado } = useAuth();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Primer arranque: en vez de verificar, se crea el PIN de este navegador.
    if (needsSetup) {
      if (pin.trim() !== confirmPin.trim()) {
        setError('Los dos PIN no coinciden.');
        setConfirmPin('');
        setIsSubmitting(false);
        return;
      }
      const created = await setupPin(pin);
      if (!created.ok) {
        setError(created.message ?? 'No se pudo crear el PIN.');
        setPin('');
        setConfirmPin('');
      }
      setIsSubmitting(false);
      return;
    }

    const result = await login(username, pin);
    if (!result.ok) {
      setError(result.message ?? 'No se pudo iniciar sesión.');
      setPin('');
    }
    setIsSubmitting(false);
  };

  const field =
    'w-full bg-obsidian border border-white/14 py-3 px-3.5 text-[13px] text-marble placeholder:text-marble/25 focus:outline-none focus:border-silver/50 transition-colors';

  /* Sin servidor que valide, el panel no se abre. Antes esta misma situación
     mostraba "crea tu PIN" y dejaba entrar a cualquiera que llegara a /admin. */
  if (panelBloqueado) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-sm">
          <BrandLockup size="md" className="mb-10" />
          <div className="bg-basalt border border-white/10 p-7">
            <div className="flex items-center gap-2.5 mb-6 pb-5 border-b border-white/8">
              <Lock className="w-4 h-4 text-silver/70" />
              <h1 className="font-display text-lg text-marble">Panel cerrado</h1>
            </div>
            <p className="text-[11.5px] leading-relaxed text-marble/50">
              Este panel solo abre cuando el servidor puede verificar las
              credenciales, y todavía no está configurado. No hay forma de entrar
              desde aquí, y eso es a propósito.
            </p>
            <p className="mt-4 text-[11.5px] leading-relaxed text-marble/35">
              Si eres el dueño: falta definir{' '}
              <code className="text-silver">ADMIN_PIN_HASH</code> y{' '}
              <code className="text-silver">ADMIN_SESSION_SECRET</code> en Vercel.
              Está explicado en el README.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <BrandLockup size="md" className="mb-10" />

        <div className="bg-basalt border border-white/10 p-7">
          <div className="flex items-center gap-2.5 mb-6 pb-5 border-b border-white/8">
            <Lock className="w-4 h-4 text-silver/70" />
            <h1 className="font-display text-lg text-marble">
              {needsSetup ? 'Crea tu PIN de acceso' : 'Panel de administración'}
            </h1>
          </div>

          {needsSetup && (
            <p className="mb-5 text-[11.5px] leading-relaxed text-marble/45">
              Este navegador todavía no tiene PIN. Defínelo ahora: queda guardado
              solo aquí, nunca se sube al repositorio.
            </p>
          )}

          {validaEnServidor && (
            <p className="mb-5 text-[11.5px] leading-relaxed text-marble/45">
              El usuario y el PIN los verifica el servidor, así que sirven desde
              cualquier equipo y no se pueden saltar desde el navegador. Tu sesión
              dura dos horas y es la que autoriza a publicar los cambios.
            </p>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            {!needsSetup && (
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
            )}

            <div>
              <label
                htmlFor="admin-pin"
                className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-marble/40 mb-2"
              >
                {needsSetup ? 'PIN nuevo (6–12 dígitos)' : 'PIN'}
              </label>
              <input
                id="admin-pin"
                type="password"
                inputMode="numeric"
                autoComplete={needsSetup ? 'new-password' : 'current-password'}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError(null);
                }}
                placeholder="••••••"
                className={`${field} tracking-[0.35em]`}
                autoFocus={needsSetup}
                required
              />
            </div>

            {needsSetup && (
              <div>
                <label
                  htmlFor="admin-pin-confirm"
                  className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-marble/40 mb-2"
                >
                  Repite el PIN
                </label>
                <input
                  id="admin-pin-confirm"
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  value={confirmPin}
                  onChange={(e) => {
                    setConfirmPin(e.target.value);
                    setError(null);
                  }}
                  placeholder="••••••"
                  className={`${field} tracking-[0.35em]`}
                  required
                />
              </div>
            )}

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
              {isSubmitting
                ? needsSetup
                  ? 'Guardando'
                  : 'Verificando'
                : needsSetup
                  ? 'Crear PIN y entrar'
                  : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-[11px] leading-relaxed text-marble/30 text-center">
          {needsSetup
            ? 'El PIN vive en este navegador. Si entras desde otro equipo, tendrás que definirlo de nuevo.'
            : validaEnServidor
              ? 'El acceso se bloquea 15 minutos tras 5 intentos fallidos, también del lado del servidor.'
              : 'El acceso se bloquea 15 minutos tras 5 intentos fallidos.'}
        </p>
      </div>
    </div>
  );
}
