import { Component, type ErrorInfo, type ReactNode } from 'react';
import { TempleMark } from './TempleMark';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  componentStack: string | null;
  copied: boolean;
}

/**
 * Sin esto, un error en una sola tarjeta dejaba la página en blanco.
 *
 * La pantalla muestra el error real en vez de un mensaje genérico: cuando algo
 * falla en el equipo de otra persona, el mensaje es lo único con lo que se puede
 * arreglar. También ofrece borrar los datos guardados, que es la causa más común
 * (catálogo guardado por una versión anterior de la aplicación).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null, copied: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ componentStack: info.componentStack ?? null });
    // En producción, envía esto a tu servicio de monitoreo (Sentry, LogRocket…).
    console.error('[PAPI SHOES]', error, info.componentStack);
  }

  private report(): string {
    const { error, componentStack } = this.state;
    return [
      `Mensaje: ${error?.message ?? 'desconocido'}`,
      `Ruta: ${window.location.pathname}`,
      `Navegador: ${navigator.userAgent}`,
      '',
      error?.stack ?? '',
      componentStack ?? '',
    ].join('\n');
  }

  private copyReport = async () => {
    try {
      await navigator.clipboard.writeText(this.report());
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    } catch {
      /* el navegador bloqueó el portapapeles */
    }
  };

  /** Borra el catálogo guardado en este navegador y vuelve a los datos de fábrica. */
  private resetStoredData = () => {
    const ok = confirm(
      'Esto borra el catálogo guardado en este navegador y vuelve a los pares de ejemplo. ' +
        'Si tienes cambios sin exportar, se pierden. ¿Continuar?',
    );
    if (!ok) return;
    try {
      localStorage.removeItem('papi_shoes_inventory');
      localStorage.removeItem('papi_shoes_settings');
      localStorage.removeItem('papi_attempts');
      sessionStorage.clear();
    } catch {
      /* almacenamiento bloqueado por el navegador */
    }
    window.location.href = '/';
  };

  render() {
    const { error, componentStack, copied } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-xl space-y-7">
          <div className="flex flex-col items-center text-center gap-5">
            <TempleMark className="w-14 h-14 opacity-55" />
            <div className="space-y-2.5">
              <h1 className="font-display text-4xl text-marble">Algo se rompió</h1>
              <p className="text-[13px] text-marble/50 leading-relaxed max-w-sm mx-auto">
                La página no pudo cargarse. Abajo está el detalle técnico del fallo.
              </p>
            </div>
          </div>

          {/* El error real, visible */}
          <div className="bg-basalt border border-red-500/30">
            <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between gap-3">
              <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-red-300">
                Detalle del error
              </span>
              <button
                onClick={this.copyReport}
                className="text-[9px] font-semibold uppercase tracking-[0.16em] text-marble/50 hover:text-marble transition-colors"
              >
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            <div className="px-4 py-3.5 space-y-3">
              <p className="font-mono text-[12px] text-red-200 break-words leading-relaxed">
                {error.message || 'Error sin mensaje'}
              </p>

              {(error.stack || componentStack) && (
                <details>
                  <summary className="cursor-pointer text-[10px] uppercase tracking-[0.16em] text-marble/40 hover:text-marble/70 transition-colors">
                    Ver traza completa
                  </summary>
                  <pre className="mt-3 max-h-56 overflow-auto text-[10.5px] leading-relaxed text-marble/45 whitespace-pre-wrap break-words">
                    {error.stack}
                    {componentStack}
                  </pre>
                </details>
              )}
            </div>
          </div>

          {/* Salidas */}
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-marble text-obsidian text-[10px] font-bold uppercase tracking-[0.22em] hover:bg-silver transition-colors"
            >
              Recargar la página
            </button>

            <button
              onClick={this.resetStoredData}
              className="w-full py-3.5 border border-white/15 text-marble/60 text-[10px] font-bold uppercase tracking-[0.22em] hover:text-marble hover:border-silver/40 transition-colors"
            >
              Borrar datos guardados y empezar de cero
            </button>

            <p className="text-[11px] text-marble/35 leading-relaxed text-center pt-1">
              Si el error vuelve después de recargar, casi siempre se debe a un
              catálogo guardado por una versión anterior. El segundo botón lo borra.
            </p>
          </div>
        </div>
      </div>
    );
  }
}
