import { SearchX } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { generateDirectWhatsAppContact } from '../../lib/utils';

interface EmptyStateProps {
  query?: string;
  onReset?: () => void;
}

/** Una pantalla vacía es una invitación a actuar, no un callejón sin salida. */
export function EmptyState({ query, onReset }: EmptyStateProps) {
  const { settings } = useStore();

  return (
    <div className="py-24 px-6 text-center max-w-md mx-auto space-y-6">
      <SearchX className="w-9 h-9 mx-auto text-marble/25" strokeWidth={1.2} />
      <div className="space-y-2.5">
        <h3 className="font-display text-2xl text-marble">
          Ningún par coincide
        </h3>
        <p className="text-[13px] text-marble/45 leading-relaxed">
          Ajusta los filtros para ver más resultados. Si buscas una referencia
          puntual, la conseguimos bajo encargo en 8 a 14 días.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
        {onReset && (
          <button
            onClick={onReset}
            className="px-5 py-3 border border-white/15 text-marble/70 hover:text-marble hover:border-silver/40 text-[10px] font-semibold uppercase tracking-[0.22em] transition-colors"
          >
            Quitar filtros
          </button>
        )}
        <a
          href={generateDirectWhatsAppContact(
            settings,
            query ? `Búsqueda de: ${query}` : 'Un par que no está en el catálogo',
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-3 bg-marble text-obsidian text-[10px] font-bold uppercase tracking-[0.22em] hover:bg-silver transition-colors"
        >
          Pedirlo bajo encargo
        </a>
      </div>
    </div>
  );
}
