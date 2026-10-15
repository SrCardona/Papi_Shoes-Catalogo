import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Sneaker } from '../../types';
import { useStore } from '../../context/StoreContext';
import { TenisFlotante } from './TenisFlotante';
import { cx, formatPrice } from '../../lib/utils';

interface CarruselProps {
  titulo: string;
  pares: Sneaker[];
  /** Enlace opcional junto al título ("Ver todo"). */
  accion?: React.ReactNode;
}

/**
 * Fila horizontal de pares.
 *
 * Se desplaza con el dedo o la rueda, y los botones solo aparecen desde `md`:
 * en un teléfono el gesto ya está y dos flechas encima de las fotos estorban.
 * Usa el desplazamiento nativo con `scroll-snap` en vez de una librería, así
 * que funciona igual sin JavaScript y con el teclado.
 */
export function Carrusel({ titulo, pares, accion }: CarruselProps) {
  const pista = useRef<HTMLDivElement>(null);
  if (pares.length === 0) return null;

  const mover = (sentido: 1 | -1) => {
    const el = pista.current;
    if (!el) return;
    el.scrollBy({ left: sentido * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <section aria-label={titulo}>
      <header className="flex items-end justify-between gap-4 mb-4">
        <h2 className="font-display text-2xl sm:text-[28px] text-marble">{titulo}</h2>
        <div className="flex items-center gap-3">
          {accion}
          <div className="hidden md:flex gap-px bg-white/8 border border-white/8">
            <BotonFlecha etiqueta="Anteriores" onClick={() => mover(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </BotonFlecha>
            <BotonFlecha etiqueta="Siguientes" onClick={() => mover(1)}>
              <ChevronRight className="w-4 h-4" />
            </BotonFlecha>
          </div>
        </div>
      </header>

      <div
        ref={pista}
        className="flex gap-px overflow-x-auto snap-x snap-mandatory overscroll-x-contain bg-white/8 border border-white/8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {pares.map((s) => (
          <TarjetaCarrusel key={s.id} sneaker={s} />
        ))}
      </div>
    </section>
  );
}

function BotonFlecha({
  etiqueta,
  onClick,
  children,
}: {
  etiqueta: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      onClick={onClick}
      className="w-9 h-9 inline-flex items-center justify-center bg-basalt text-marble/70 hover:text-marble hover:bg-lapis transition-colors"
    >
      {children}
    </button>
  );
}

/**
 * Cada tarjeta dice su línea. En una fila que junta las dos, el rótulo es lo
 * único que impide que un par de uso diario se lea como verificado.
 */
function TarjetaCarrusel({ sneaker }: { sneaker: Sneaker }) {
  const { settings } = useStore();
  const original = sneaker.category === 'originales';

  return (
    <Link
      to={`/producto/${sneaker.id}`}
      className="group snap-start shrink-0 w-[62%] sm:w-[38%] md:w-[28%] lg:w-[20%] bg-basalt flex flex-col focus:outline-none focus-visible:ring-1 focus-visible:ring-silver"
    >
      <div className="aspect-square p-4">
        <TenisFlotante
          sneaker={sneaker}
          sizes="(max-width: 640px) 62vw, (max-width: 1024px) 38vw, 20vw"
        />
      </div>
      <div className="px-3.5 pb-3.5 pt-2.5 border-t border-white/6 space-y-1.5">
        <span
          className={cx(
            'block text-[8px] font-bold uppercase tracking-[0.24em]',
            original ? 'text-silver' : 'text-lapis-lit',
          )}
        >
          {original ? 'Original · Legit' : 'Sneakers'}
        </span>
        <p className="font-body font-semibold text-[12px] sm:text-[13px] leading-snug text-marble truncate">
          {sneaker.name}
        </p>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[9px] uppercase tracking-[0.2em] text-marble/40 truncate">
            {sneaker.brand === 'Otras' ? 'Otras marcas' : sneaker.brand}
          </span>
          {sneaker.status === 'agotado' ? (
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-marble/40">
              Agotado
            </span>
          ) : (
            <span className="font-display text-base leading-none text-marble">
              {formatPrice(sneaker.price, settings.currency, settings.currencySymbol)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
