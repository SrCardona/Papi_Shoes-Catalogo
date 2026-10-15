import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { Sneaker, SneakerCategory } from '../../types';
import { useStore } from '../../context/StoreContext';
import { TenisFlotante } from './TenisFlotante';
import { NOMBRE_DE_LINEA, RUTA_DE_LINEA } from '../../lib/vitrina';
import { cx, formatPrice } from '../../lib/utils';

interface RankingLineaProps {
  titulo: string;
  linea: SneakerCategory;
  /** Ya en orden: el primero es el número 1. */
  pares: Sneaker[];
}

/**
 * Un ranking numerado de UNA línea.
 *
 * Recibe la línea aparte de los pares, en vez de deducirla, para que el rótulo
 * y el enlace de "ver todos" no dependan de que la lista venga bien armada: si
 * un par de la otra línea se colara, se descarta aquí en lugar de salir bajo un
 * rótulo que no es el suyo. Un par de uso diario bajo "Originales" es
 * justamente lo que no puede pasar.
 */
export function RankingLinea({ titulo, linea, pares }: RankingLineaProps) {
  const propios = pares.filter((s) => s.category === linea);
  if (propios.length === 0) return null;

  const [primero, ...resto] = propios;

  return (
    <section aria-label={titulo} className="flex flex-col">
      <header className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="font-display text-2xl sm:text-[28px] text-marble">{titulo}</h2>
        <span className="eyebrow">{NOMBRE_DE_LINEA[linea]}</span>
      </header>

      <ol className="flex flex-col gap-px bg-white/8 border border-white/8">
        <li>
          <PrimerPuesto sneaker={primero} />
        </li>
        {resto.map((s, i) => (
          <li key={s.id}>
            <FilaRanking sneaker={s} puesto={i + 2} />
          </li>
        ))}
      </ol>

      <Link
        to={RUTA_DE_LINEA[linea]}
        className="mt-3 inline-flex items-center gap-2 self-start text-[10px] font-semibold uppercase tracking-[0.24em] text-lapis-lit hover:text-marble transition-colors"
      >
        Todo {NOMBRE_DE_LINEA[linea]}
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </section>
  );
}

function Precio({ sneaker, claro = false }: { sneaker: Sneaker; claro?: boolean }) {
  const { settings } = useStore();
  if (sneaker.status === 'agotado') {
    return (
      <span
        className={cx(
          'text-[9px] font-bold uppercase tracking-[0.2em]',
          claro ? 'text-obsidian/45' : 'text-marble/40',
        )}
      >
        Agotado
      </span>
    );
  }
  return (
    <span className={cx('font-display text-lg leading-none', claro ? 'text-obsidian' : 'text-marble')}>
      {formatPrice(sneaker.price, settings.currency, settings.currencySymbol)}
    </span>
  );
}

/**
 * El número 1 va sobre mármol: es el mismo contraste que separa el primer
 * puesto en la referencia, hecho con los colores de la casa en vez de blanco
 * puro.
 */
function PrimerPuesto({ sneaker }: { sneaker: Sneaker }) {
  return (
    <Link
      to={`/producto/${sneaker.id}`}
      className="group block bg-marble text-obsidian focus:outline-none focus-visible:ring-2 focus-visible:ring-lapis"
    >
      <div className="flex items-start justify-between px-3.5 pt-3">
        <Puesto n={1} claro />
        {sneaker.status === 'bajo_encargo' && (
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-obsidian/50">
            Bajo encargo
          </span>
        )}
      </div>
      <div className="aspect-[16/10] px-6 py-2">
        <TenisFlotante
          sneaker={sneaker}
          sizes="(max-width: 1024px) 90vw, 30vw"
        />
      </div>
      <div className="flex items-end justify-between gap-3 px-3.5 pb-3.5 pt-1 border-t border-obsidian/10">
        <Identidad sneaker={sneaker} claro />
        <Precio sneaker={sneaker} claro />
      </div>
    </Link>
  );
}

function FilaRanking({ sneaker, puesto }: { sneaker: Sneaker; puesto: number }) {
  return (
    <Link
      to={`/producto/${sneaker.id}`}
      className="group flex items-center gap-3 bg-basalt px-3.5 py-2.5 hover:bg-marble-navy transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-silver"
    >
      <Puesto n={puesto} />
      <div className="w-20 h-14 sm:w-24 sm:h-16 shrink-0">
        <TenisFlotante sneaker={sneaker} sizes="96px" />
      </div>
      <div className="min-w-0 flex-1">
        <Identidad sneaker={sneaker} />
      </div>
      <Precio sneaker={sneaker} />
    </Link>
  );
}

function Puesto({ n, claro = false }: { n: number; claro?: boolean }) {
  return (
    <span
      className={cx(
        'w-7 h-7 shrink-0 inline-flex items-center justify-center border font-display text-base leading-none',
        claro ? 'border-obsidian/25 text-obsidian' : 'border-white/15 text-marble',
      )}
    >
      {n}
    </span>
  );
}

function Identidad({ sneaker, claro = false }: { sneaker: Sneaker; claro?: boolean }) {
  return (
    <div className="min-w-0">
      <p
        className={cx(
          'font-body font-semibold text-[12px] sm:text-[13px] leading-snug truncate',
          claro ? 'text-obsidian' : 'text-marble',
        )}
      >
        {sneaker.name}
      </p>
      <p
        className={cx(
          'text-[9px] uppercase tracking-[0.2em] truncate mt-0.5',
          claro ? 'text-obsidian/50' : 'text-marble/40',
        )}
      >
        {sneaker.brand === 'Otras' ? 'Otras marcas' : sneaker.brand}
        {sneaker.details.colorway && ` · ${sneaker.details.colorway}`}
      </p>
    </div>
  );
}
