import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Sneaker } from '../../types';
import { TarjetaPar } from './TarjetaPar';

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
          <TarjetaPar
            key={s.id}
            sneaker={s}
            sizes="(max-width: 640px) 62vw, (max-width: 1024px) 38vw, 20vw"
            className="snap-start shrink-0 w-[62%] sm:w-[38%] md:w-[28%] lg:w-[20%]"
          />
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
