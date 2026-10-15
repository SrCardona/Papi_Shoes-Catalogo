import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Search, X } from 'lucide-react';
import type { Sneaker, SneakerCategory } from '../../types';
import { useStore } from '../../context/StoreContext';
import { coincideBusqueda } from '../../lib/busqueda';
import { NOMBRE_DE_LINEA, RUTA_DE_LINEA, fotoDeVitrina } from '../../lib/vitrina';
import { SmartImage } from '../ui/SmartImage';
import { cx, formatPrice } from '../../lib/utils';

/** Cuántos pares se muestran por línea antes del enlace a "ver todos". */
const POR_LINEA = 4;

/** Por debajo de esto casi todo coincide y la lista solo hace ruido. */
const MINIMO_LETRAS = 2;

const LINEAS: SneakerCategory[] = ['originales', 'general'];

interface BuscadorEncabezadoProps {
  /** Arranca con el foco puesto: lo usa el buscador desplegable del celular. */
  autoFocus?: boolean;
  /** Se llama al ir a un resultado, para que quien lo abrió lo cierre. */
  onNavegar?: () => void;
  className?: string;
}

/**
 * Buscador con resultados al vuelo, separados por línea.
 *
 * Nunca se arma una sola lista: "Jordan" trae pares verificados y de uso
 * diario, y juntos en una fila el cliente daría por original lo que no lo es.
 * Cada bloque lleva su rótulo y su "ver todos" apunta a su línea, no a
 * `/catalogo`, que es la vista que las mezcla.
 */
export function BuscadorEncabezado({
  autoFocus = false,
  onNavegar,
  className,
}: BuscadorEncabezadoProps) {
  const { sneakers, settings } = useStore();
  const navigate = useNavigate();
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const idLista = useId();

  const consulta = texto.trim().toLowerCase();
  const buscando = consulta.length >= MINIMO_LETRAS;

  const porLinea = useMemo(() => {
    const vacio: Record<SneakerCategory, Sneaker[]> = { originales: [], general: [] };
    if (!buscando) return vacio;
    for (const s of sneakers) {
      if (coincideBusqueda(s, consulta)) vacio[s.category].push(s);
    }
    /* Solo caben cuatro por línea, así que van primero los que lo dicen en el
       nombre o la marca. Sin esto, "puma" abría con un Nike cuya descripción
       menciona a Puma. El orden es estable: entre iguales manda el catálogo. */
    const enNombre = (s: Sneaker) =>
      `${s.name} ${s.brand}`.toLowerCase().includes(consulta) ? 0 : 1;
    for (const linea of LINEAS) vacio[linea].sort((a, b) => enNombre(a) - enNombre(b));
    return vacio;
  }, [sneakers, consulta, buscando]);

  const total = porLinea.originales.length + porLinea.general.length;

  /* Un toque fuera lo cierra. Se escucha `pointerdown` y no `click` para que
     cierre antes de que el toque llegue a otro control de la barra. */
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('pointerdown', fuera);
    return () => document.removeEventListener('pointerdown', fuera);
  }, [abierto]);

  const terminar = () => {
    setTexto('');
    setAbierto(false);
    onNavegar?.();
  };

  const verLinea = (linea: SneakerCategory) =>
    `${RUTA_DE_LINEA[linea]}?q=${encodeURIComponent(texto.trim())}`;

  /* Enter lleva a la línea con más resultados (en empate, Originales). La
     lista abierta ya enseña las dos, así que quien busca en la otra la tiene a
     la vista; lo que no hace nunca es mandarlo a la vista mezclada. */
  const alEnviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buscando || total === 0) return;
    const linea: SneakerCategory =
      porLinea.general.length > porLinea.originales.length ? 'general' : 'originales';
    navigate(verLinea(linea));
    terminar();
  };

  return (
    <div ref={raiz} className={cx('relative', className)}>
      <form role="search" onSubmit={alEnviar}>
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-marble/40 pointer-events-none" />
        <input
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setAbierto(false);
          }}
          autoFocus={autoFocus}
          placeholder={`Buscar entre ${sneakers.length} pares`}
          aria-label="Buscar en el catálogo"
          aria-controls={idLista}
          aria-expanded={abierto && buscando}
          className="w-full bg-basalt border border-white/10 py-2 pl-9 pr-8 text-[12px] text-marble placeholder:text-marble/35 focus:outline-none focus:border-lapis-lit transition-colors"
        />
        {texto && (
          <button
            type="button"
            aria-label="Borrar búsqueda"
            onClick={() => setTexto('')}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-marble/40 hover:text-marble"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </form>

      {abierto && buscando && (
        <div
          id={idLista}
          className="absolute left-0 right-0 top-full mt-px z-50 bg-obsidian border border-white/10 max-h-[70vh] overflow-y-auto"
        >
          {total === 0 ? (
            <p className="px-4 py-5 text-[12px] text-marble/50">
              Nada con "{texto.trim()}". Prueba con la marca o el modelo, o escríbenos y lo buscamos.
            </p>
          ) : (
            LINEAS.filter((l) => porLinea[l].length > 0).map((linea) => (
              <section key={linea} className="border-b border-white/8 last:border-b-0">
                <header className="flex items-center justify-between px-4 pt-3 pb-2">
                  <span
                    className={cx(
                      'text-[9px] font-bold uppercase tracking-[0.26em]',
                      linea === 'originales' ? 'text-silver' : 'text-lapis-lit',
                    )}
                  >
                    {linea === 'originales' ? 'Originales · Legit' : 'Sneakers'}
                  </span>
                  <span className="text-[10px] text-marble/35 tabular-nums">
                    {porLinea[linea].length}
                  </span>
                </header>
                <ul>
                  {porLinea[linea].slice(0, POR_LINEA).map((s) => (
                    <li key={s.id}>
                      <Link
                        to={`/producto/${s.id}`}
                        onClick={terminar}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-marble-navy transition-colors"
                      >
                        <span className="w-14 h-10 shrink-0 bg-basalt">
                          <SmartImage
                            src={fotoDeVitrina(s)}
                            alt=""
                            sizes="56px"
                            className="w-full h-full object-contain"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12px] font-semibold text-marble truncate">
                            {s.name}
                          </span>
                          <span className="block text-[9px] uppercase tracking-[0.18em] text-marble/40 truncate">
                            {s.brand === 'Otras' ? 'Otras marcas' : s.brand}
                            {s.details.colorway && ` · ${s.details.colorway}`}
                          </span>
                        </span>
                        <span className="font-display text-sm text-marble shrink-0">
                          {formatPrice(s.price, settings.currency, settings.currencySymbol)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  to={verLinea(linea)}
                  onClick={terminar}
                  className="flex items-center gap-2 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-lapis-lit hover:text-marble transition-colors"
                >
                  {porLinea[linea].length === 1
                    ? `Verlo en ${NOMBRE_DE_LINEA[linea]}`
                    : `Ver los ${porLinea[linea].length} en ${NOMBRE_DE_LINEA[linea]}`}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </section>
            ))
          )}
        </div>
      )}
    </div>
  );
}
