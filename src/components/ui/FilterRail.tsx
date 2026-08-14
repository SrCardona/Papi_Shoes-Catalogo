import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { FilterState, SneakerGender, SneakerStatus } from '../../types';
import { DEFAULT_FILTERS } from '../../types';
import { useStore } from '../../context/StoreContext';
import { cx, formatPrice } from '../../lib/utils';

interface FilterRailProps {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
  brands: string[];
  sizes: (number | string)[];
  resultCount: number;
  totalCount: number;
  activeCount: number;
  /** Oculta el selector de línea en las vistas que ya fijan una. */
  lockCategory?: boolean;
}

const SORT_OPTIONS: { value: FilterState['sortBy']; label: string }[] = [
  { value: 'featured', label: 'Destacados' },
  { value: 'newest', label: 'Más recientes' },
  { value: 'price-asc', label: 'Precio: menor a mayor' },
  { value: 'price-desc', label: 'Precio: mayor a menor' },
  { value: 'discount', label: 'Mayor descuento' },
];

const GENDERS: { value: 'all' | SneakerGender; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'hombre', label: 'Hombre' },
  { value: 'mujer', label: 'Mujer' },
  { value: 'unisex', label: 'Unisex' },
];

const STATUSES: { value: 'all' | SneakerStatus; label: string }[] = [
  { value: 'all', label: 'Cualquiera' },
  { value: 'disponible', label: 'Entrega inmediata' },
  { value: 'bajo_encargo', label: 'Bajo encargo' },
];

/**
 * El tamaño de letra en móvil es 16px a propósito: Safari en iPhone hace zoom
 * automático al enfocar un campo de menos de 16px y deja la página descuadrada
 * y con scroll horizontal. Desde `sm` vuelve a los 11px del diseño.
 */
const fieldBase =
  'bg-obsidian border border-white/12 py-2.5 px-3 text-[16px] sm:text-[11px] text-marble focus:outline-none focus:border-silver/45 transition-colors';

/** Campos del panel: ocupan el ancho de su columna. */
const fieldClass = `${fieldBase} w-full`;

const labelClass =
  'block text-[9px] font-semibold uppercase tracking-[0.2em] text-marble/40 mb-2';

export function FilterRail({
  filters,
  onChange,
  onReset,
  brands,
  sizes,
  resultCount,
  totalCount,
  activeCount,
  lockCategory = false,
}: FilterRailProps) {
  const { settings } = useStore();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  /**
   * Elegir un filtro cierra el panel y devuelve la vista al catálogo, que es
   * lo que se quería ver. Para cambiarlo se vuelve a abrir con el botón.
   *
   * El precio es la excepción: se aplica igual mientras se arrastra, pero el
   * panel se cierra al soltar. Cerrarlo en cada paso del deslizador lo haría
   * inmanejable.
   */
  const applyAndClose = (patch: Partial<FilterState>) => {
    onChange(patch);
    setIsPanelOpen(false);
  };

  return (
    <div className="border-y border-white/8 bg-basalt/40 sticky top-[68px] z-30 backdrop-blur-lg">
      <div className="max-w-[1400px] mx-auto px-5 lg:px-8">
        {/* Fila principal */}
        <div className="flex items-center gap-2.5 sm:gap-3 py-3 sm:py-3.5">
          <div className="relative flex-1 min-w-0 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-marble/35" />
            <input
              value={filters.searchQuery}
              onChange={(e) => onChange({ searchQuery: e.target.value })}
              placeholder="Buscar modelo o marca"
              aria-label="Buscar"
              className={cx(fieldClass, 'pl-9')}
            />
            {filters.searchQuery && (
              <button
                onClick={() => onChange({ searchQuery: '' })}
                aria-label="Limpiar búsqueda"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-marble/40 hover:text-marble"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={filters.sortBy}
            onChange={(e) =>
              onChange({ sortBy: e.target.value as FilterState['sortBy'] })
            }
            aria-label="Ordenar por"
            className={cx(fieldBase, 'hidden sm:block w-44 shrink-0 cursor-pointer')}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-obsidian">
                {o.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsPanelOpen((v) => !v)}
            aria-expanded={isPanelOpen}
            className={cx(
              'flex items-center gap-2 px-4 py-2.5 border text-[10px] font-semibold uppercase tracking-[0.18em] shrink-0 transition-colors',
              isPanelOpen || activeCount > 0
                ? 'bg-marble text-obsidian border-marble'
                : 'border-white/12 text-marble/60 hover:text-marble hover:border-silver/35',
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filtros</span>
            {activeCount > 0 && (
              <span className="tabular-nums">({activeCount})</span>
            )}
          </button>
        </div>

        {/* Panel desplegable.
            La barra va pegada arriba (`sticky`), así que el panel no puede
            crecer más que la pantalla: en un teléfono bajito el pie con
            "Restablecer" quedaría fuera de alcance. Con tope y scroll propio
            siempre se llega al final. */}
        {isPanelOpen && (
          <div className="pb-6 pt-2 border-t border-white/8 animate-fade max-h-[70vh] overflow-y-auto no-scrollbar">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 sm:gap-x-5 gap-y-5">
              {/* El orden vive fuera del panel a partir de sm. En móvil no
                  cabía en la fila de arriba y quedaba sin ningún acceso: no
                  se podía ordenar el catálogo desde un teléfono. */}
              <div className="col-span-2 sm:hidden">
                <label className={labelClass} htmlFor="f-sort">
                  Ordenar por
                </label>
                <select
                  id="f-sort"
                  value={filters.sortBy}
                  onChange={(e) =>
                    applyAndClose({
                      sortBy: e.target.value as FilterState['sortBy'],
                    })
                  }
                  className={cx(fieldClass, 'cursor-pointer')}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-obsidian">
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="f-brand">
                  Marca
                </label>
                <select
                  id="f-brand"
                  value={filters.brand}
                  onChange={(e) => applyAndClose({ brand: e.target.value })}
                  className={cx(fieldClass, 'cursor-pointer')}
                >
                  <option value="" className="bg-obsidian">
                    Todas
                  </option>
                  {brands.map((b) => (
                    <option key={b} value={b} className="bg-obsidian">
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="f-size">
                  Talla (EU)
                </label>
                <select
                  id="f-size"
                  value={filters.size}
                  onChange={(e) => applyAndClose({ size: e.target.value })}
                  className={cx(fieldClass, 'cursor-pointer')}
                >
                  <option value="" className="bg-obsidian">
                    Cualquiera
                  </option>
                  {sizes.map((s) => (
                    <option key={String(s)} value={String(s)} className="bg-obsidian">
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="f-gender">
                  Horma
                </label>
                <select
                  id="f-gender"
                  value={filters.gender}
                  onChange={(e) =>
                    applyAndClose({
                      gender: e.target.value as FilterState['gender'],
                    })
                  }
                  className={cx(fieldClass, 'cursor-pointer')}
                >
                  {GENDERS.map((g) => (
                    <option key={g.value} value={g.value} className="bg-obsidian">
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="f-status">
                  Disponibilidad
                </label>
                <select
                  id="f-status"
                  value={filters.status}
                  onChange={(e) =>
                    applyAndClose({
                      status: e.target.value as FilterState['status'],
                    })
                  }
                  className={cx(fieldClass, 'cursor-pointer')}
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value} className="bg-obsidian">
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rango de precio — declarado en el modelo anterior pero nunca usado */}
              <div className="col-span-2">
                <label className={labelClass} htmlFor="f-price">
                  Precio máximo ·{' '}
                  <span className="text-silver tabular-nums">
                    {formatPrice(
                      filters.maxPrice,
                      settings.currency,
                      settings.currencySymbol,
                    )}
                  </span>
                </label>
                <input
                  id="f-price"
                  type="range"
                  min={100_000}
                  max={DEFAULT_FILTERS.maxPrice}
                  step={50_000}
                  value={filters.maxPrice}
                  onChange={(e) => onChange({ maxPrice: Number(e.target.value) })}
                  onPointerUp={() => setIsPanelOpen(false)}
                  onKeyUp={(e) => {
                    if (e.key === 'Enter') setIsPanelOpen(false);
                  }}
                  className="w-full accent-lapis cursor-pointer"
                />
              </div>

              {!lockCategory && (
                <div className="col-span-2">
                  <span className={labelClass}>Línea</span>
                  <div className="flex gap-px border border-white/12">
                    {(
                      [
                        { value: 'all', label: 'Todo' },
                        { value: 'originales', label: 'Originales' },
                        { value: 'general', label: 'Sneakers' },
                      ] as const
                    ).map((c) => (
                      <button
                        key={c.value}
                        onClick={() => applyAndClose({ category: c.value })}
                        className={cx(
                          'flex-1 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors',
                          filters.category === c.value
                            ? 'bg-marble text-obsidian'
                            : 'text-marble/50 hover:text-marble',
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-white/8">
              <p className="text-[10px] uppercase tracking-[0.18em] text-marble/40 tabular-nums">
                {resultCount} de {totalCount} pares
              </p>
              <button
                onClick={() => {
                  onReset();
                  setIsPanelOpen(false);
                }}
                className="text-[10px] font-semibold uppercase tracking-[0.2em] text-marble/45 hover:text-marble transition-colors"
              >
                Restablecer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
