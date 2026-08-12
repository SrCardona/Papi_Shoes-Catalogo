import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, X } from 'lucide-react';
import type { Delivery } from '../../types';
import { SmartImage } from './SmartImage';
import { cx, formatMonthYear } from '../../lib/utils';

interface DeliveryWallProps {
  deliveries: Delivery[];
  /** Chips de ciudad y libro de cobertura. Se apagan en la portada. */
  showFilters?: boolean;
  /** Corta el muro a las N entregas más recientes. */
  limit?: number;
}

/**
 * El muro de entregas: cada foto es una placa del templo con el barrio y la
 * ciudad grabados debajo. La ubicación se dibuja aquí, con la tipografía de
 * la marca, en vez de depender de que venga quemada dentro de la imagen.
 */
export function DeliveryWall({
  deliveries,
  showFilters = true,
  limit,
}: DeliveryWallProps) {
  const [city, setCity] = useState<string>('all');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  /* Ciudades ordenadas por número de entregas: la cobertura real, no un
     listado alfabético que no dice nada. */
  const cities = useMemo(() => {
    const tally = new Map<string, number>();
    for (const d of deliveries) tally.set(d.city, (tally.get(d.city) ?? 0) + 1);
    return [...tally.entries()].sort((a, b) => b[1] - a[1]);
  }, [deliveries]);

  const visible = useMemo(() => {
    const sorted = [...deliveries].sort(
      (a, b) => Date.parse(b.deliveredAt) - Date.parse(a.deliveredAt),
    );
    const filtered =
      city === 'all' ? sorted : sorted.filter((d) => d.city === city);
    return limit ? filtered.slice(0, limit) : filtered;
  }, [deliveries, city, limit]);

  /* Navegación del visor por teclado. */
  useEffect(() => {
    if (openIndex === null) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenIndex(null);
      if (e.key === 'ArrowRight')
        setOpenIndex((i) => (i === null ? null : (i + 1) % visible.length));
      if (e.key === 'ArrowLeft')
        setOpenIndex((i) =>
          i === null ? null : (i - 1 + visible.length) % visible.length,
        );
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [openIndex, visible.length]);

  if (!deliveries.length) return null;

  const active = openIndex === null ? null : visible[openIndex] ?? null;

  return (
    <div className="space-y-7">
      {showFilters && cities.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCity('all')}
            className={cx(
              'px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] border transition-colors',
              city === 'all'
                ? 'bg-marble text-obsidian border-marble'
                : 'border-white/12 text-marble/50 hover:text-marble hover:border-silver/40',
            )}
          >
            Todas · {deliveries.length}
          </button>
          {cities.map(([name, count]) => (
            <button
              key={name}
              onClick={() => setCity(name)}
              className={cx(
                'px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] border transition-colors',
                city === name
                  ? 'bg-marble text-obsidian border-marble'
                  : 'border-white/12 text-marble/50 hover:text-marble hover:border-silver/40',
              )}
            >
              {name} · {count}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-white/6 border border-white/6">
        {visible.map((delivery, i) => (
          <button
            key={delivery.id}
            onClick={() => setOpenIndex(i)}
            style={{ animationDelay: `${Math.min(i, 11) * 55}ms` }}
            className="column-card animate-rise group text-left"
            aria-label={`Ver entrega en ${delivery.neighborhood || delivery.city}`}
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-obsidian fluted">
              <SmartImage
                src={delivery.image}
                alt={
                  delivery.productName
                    ? `${delivery.productName} entregado en ${delivery.city}`
                    : `Entrega en ${delivery.city}`
                }
                sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
                className="w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
              />
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent"
              />

              {/* Placa: la ubicación grabada sobre la foto */}
              <div className="absolute inset-x-0 bottom-0 p-3.5">
                {!delivery.locationInImage && (
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-marble leading-tight">
                    <MapPin className="w-3.5 h-3.5 text-silver shrink-0" />
                    <span className="truncate">
                      {delivery.neighborhood
                        ? `${delivery.neighborhood} · ${delivery.city}`
                        : delivery.city}
                    </span>
                  </p>
                )}
                <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-marble/45 truncate">
                  {formatMonthYear(delivery.deliveredAt)}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="h-px stylobate" />

      {/* Visor a pantalla completa */}
      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Foto de entrega"
          className="fixed inset-0 z-50 bg-obsidian/96 backdrop-blur-sm animate-fade flex flex-col"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
            <p className="eyebrow">
              Entrega {(openIndex ?? 0) + 1} / {visible.length}
            </p>
            <button
              onClick={() => setOpenIndex(null)}
              aria-label="Cerrar"
              className="p-2 text-marble/60 hover:text-marble transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center px-4 py-6 min-h-0">
            {visible.length > 1 && (
              <button
                onClick={() =>
                  setOpenIndex((i) =>
                    i === null ? null : (i - 1 + visible.length) % visible.length,
                  )
                }
                aria-label="Entrega anterior"
                className="hidden sm:flex items-center justify-center w-11 h-11 shrink-0 border border-white/12 text-marble/60 hover:text-marble hover:border-silver/40 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <div className="flex-1 max-w-3xl mx-auto px-4 min-h-0 flex flex-col items-center">
              <SmartImage
                src={active.image}
                alt={active.productName ?? `Entrega en ${active.city}`}
                loading="eager"
                className="max-h-[62vh] w-auto object-contain border border-white/8"
              />
              <div className="mt-6 text-center space-y-2 max-w-md">
                {!active.locationInImage && (
                  <p className="flex items-center justify-center gap-2 font-display text-2xl text-marble">
                    <MapPin className="w-4 h-4 text-silver" />
                    {active.neighborhood
                      ? `${active.neighborhood} · ${active.city}`
                      : active.city}
                  </p>
                )}
                {active.productName && (
                  <p className="text-[13px] text-marble/70">{active.productName}</p>
                )}
                {active.note && (
                  <p className="text-[12px] text-marble/40 leading-relaxed">
                    {active.note}
                  </p>
                )}
                <p className="text-[9px] uppercase tracking-[0.24em] text-marble/30">
                  {formatMonthYear(active.deliveredAt)}
                </p>
              </div>
            </div>

            {visible.length > 1 && (
              <button
                onClick={() =>
                  setOpenIndex((i) => (i === null ? null : (i + 1) % visible.length))
                }
                aria-label="Entrega siguiente"
                className="hidden sm:flex items-center justify-center w-11 h-11 shrink-0 border border-white/12 text-marble/60 hover:text-marble hover:border-silver/40 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Libro de cobertura: ciudades atendidas con su conteo de entregas. */
export function DeliveryLedger({ deliveries }: { deliveries: Delivery[] }) {
  const cities = useMemo(() => {
    const tally = new Map<string, number>();
    for (const d of deliveries) tally.set(d.city, (tally.get(d.city) ?? 0) + 1);
    return [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [deliveries]);

  if (!cities.length) return null;

  return (
    <ul className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/8 border border-white/8">
      {cities.map(([name, count]) => (
        <li key={name} className="bg-basalt px-5 py-4">
          <p className="text-[9px] uppercase tracking-[0.2em] text-marble/40 truncate">
            {name}
          </p>
          <p className="font-display text-2xl text-marble mt-1.5 tabular-nums">
            {count}
          </p>
        </li>
      ))}
    </ul>
  );
}
