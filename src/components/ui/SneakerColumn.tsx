import { Link } from 'react-router-dom';
import { ShieldCheck, Clock, XCircle } from 'lucide-react';
import type { Sneaker } from '../../types';
import { useStore } from '../../context/StoreContext';
import { SmartImage } from './SmartImage';
import { cx, discountPercent, formatPrice } from '../../lib/utils';

const STATUS_META = {
  disponible: { label: 'Entrega inmediata', Icon: ShieldCheck, tone: 'text-emerald-300' },
  bajo_encargo: { label: 'Bajo encargo', Icon: Clock, tone: 'text-silver' },
  agotado: { label: 'Agotado', Icon: XCircle, tone: 'text-marble/35' },
} as const;

interface SneakerColumnProps {
  sneaker: Sneaker;
  /** Retardo escalonado para la entrada de la columnata. */
  index?: number;
}

/**
 * Cada producto es una columna del templo: fuste estriado, capitel con el
 * la línea a la que pertenece y basa con el precio. El hover la ilumina.
 */
export function SneakerColumn({ sneaker, index = 0 }: SneakerColumnProps) {
  const { settings } = useStore();
  const discount = discountPercent(sneaker);
  const status = STATUS_META[sneaker.status];
  const isOriginal = sneaker.category === 'originales';
  const isSoldOut = sneaker.status === 'agotado';

  return (
    <article
      className="column-card animate-rise group"
      style={{ animationDelay: `${Math.min(index, 11) * 55}ms` }}
    >
      <Link
        to={`/producto/${sneaker.id}`}
        className="block focus:outline-none focus-visible:ring-1 focus-visible:ring-silver"
      >
        {/* Capitel: rótulo de la línea */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/6">
          <span
            className={cx(
              'text-[8px] font-bold uppercase tracking-[0.24em]',
              isOriginal ? 'text-silver' : 'text-lapis-lit',
            )}
          >
            {isOriginal ? 'Original · Legit' : 'Sneakers'}
          </span>
          {discount && (
            <span className="text-[9px] font-bold text-marble bg-lapis px-1.5 py-0.5">
              −{discount}%
            </span>
          )}
        </div>

        {/* Fuste: la imagen sobre estriado */}
        <div
          className={cx(
            'relative aspect-square overflow-hidden bg-obsidian fluted',
            isSoldOut && 'opacity-45',
          )}
        >
          <SmartImage
            src={sneaker.images[0]}
            alt={sneaker.name}
            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.07]"
          />

          {sneaker.isNewArrival && !isSoldOut && (
            <span className="absolute top-3 left-3 bg-marble text-obsidian text-[8px] font-bold uppercase tracking-[0.2em] px-2 py-1">
              Nuevo
            </span>
          )}

          {isSoldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-obsidian/55">
              <span className="font-display text-xl text-marble/70">Agotado</span>
            </div>
          )}
        </div>

        {/* Basa: identidad y precio */}
        <div className="p-3.5 space-y-2.5">
          <div className="min-h-[2.6rem]">
            <p className="text-[9px] uppercase tracking-[0.22em] text-marble/35 mb-1">
              {sneaker.brand}
            </p>
            <h3 className="font-body font-semibold text-[13px] leading-snug text-marble line-clamp-2 normal-case tracking-normal">
              {sneaker.name}
            </h3>
          </div>

          <div className="flex items-end justify-between gap-2 pt-1">
            <div className="leading-none">
              <p className="font-display text-lg text-marble">
                {formatPrice(sneaker.price, settings.currency, settings.currencySymbol)}
              </p>
              {sneaker.originalPrice && sneaker.originalPrice > sneaker.price && (
                <p className="text-[10px] text-marble/30 line-through mt-1">
                  {formatPrice(
                    sneaker.originalPrice,
                    settings.currency,
                    settings.currencySymbol,
                  )}
                </p>
              )}
            </div>
            <span className="text-[9px] text-marble/30 tabular-nums">
              {sneaker.sizes.length} tallas
            </span>
          </div>

          <div
            className={cx(
              'flex items-center gap-1.5 pt-2 border-t border-white/6',
              status.tone,
            )}
          >
            <status.Icon className="w-3 h-3" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.16em]">
              {status.label}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

/** La columnata: cuadrícula de productos asentada sobre el estilóbato. */
export function Colonnade({ sneakers }: { sneakers: Sneaker[] }) {
  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-white/6 border border-white/6">
        {sneakers.map((sneaker, i) => (
          <SneakerColumn key={sneaker.id} sneaker={sneaker} index={i} />
        ))}
      </div>
      <div className="h-px stylobate mt-px" />
    </div>
  );
}
