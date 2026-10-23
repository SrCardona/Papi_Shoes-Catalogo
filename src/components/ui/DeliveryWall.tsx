import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, X } from 'lucide-react';
import type { Delivery } from '../../types';
import { SmartImage } from './SmartImage';
import { cx, formatMonthYear } from '../../lib/utils';
import { useMovimientoReducido } from '../../hooks/useMovimientoReducido';

interface DeliveryWallProps {
  deliveries: Delivery[];
  /** Chips de ciudad y libro de cobertura. Se apagan en la portada. */
  showFilters?: boolean;
  /** Corta el muro a las N entregas más recientes. */
  limit?: number;
  /** `arco` es la versión de la portada: una fila curva que se desliza. */
  variante?: 'muro' | 'arco';
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
  variante = 'muro',
}: DeliveryWallProps) {
  const [city, setCity] = useState<string>('all');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [reach, setReach] = useState({
    overflows: false,
    atStart: true,
    atEnd: true,
  });

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

  /* El margen de 4 px absorbe los redondeos del navegador al medir el scroll:
     sin él la flecha derecha queda activa aunque ya no haya recorrido. */
  const readReach = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setReach({
      overflows: max > 4,
      atStart: el.scrollLeft <= 4,
      atEnd: el.scrollLeft >= max - 4,
    });
  }, []);

  /**
   * La medición vive en un ResizeObserver y no en el cuerpo del efecto porque
   * al observar el navegador entrega una primera medida con el layout ya hecho:
   * un solo mecanismo sirve de arranque y de reacción al cambio de tamaño.
   * Depende de `visible.length` para volver a medir cuando el filtro de ciudad
   * cambia cuántas tarjetas hay, que es lo que decide si sobran flechas.
   */
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => readReach());
    observer.observe(el);
    return () => observer.disconnect();
  }, [readReach, visible.length]);

  /* Avanza una pantalla visible, que es lo que el ojo espera de una flecha. */
  const page = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth, behavior: 'smooth' });
  };

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
              'px-4 py-2 text-rotulo font-semibold uppercase tracking-[0.18em] border transition-colors',
              city === 'all'
                ? 'bg-marble text-obsidian border-marble'
                : 'border-white/12 text-secundario hover:text-marble hover:border-silver/40',
            )}
          >
            Todas · {deliveries.length}
          </button>
          {cities.map(([name, count]) => (
            <button
              key={name}
              onClick={() => setCity(name)}
              className={cx(
                'px-4 py-2 text-rotulo font-semibold uppercase tracking-[0.18em] border transition-colors',
                city === name
                  ? 'bg-marble text-obsidian border-marble'
                  : 'border-white/12 text-secundario hover:text-marble hover:border-silver/40',
              )}
            >
              {name} · {count}
            </button>
          ))}
        </div>
      )}

      {variante === 'arco' ? (
        <ArcoEntregas entregas={visible} onAbrir={setOpenIndex} />
      ) : (
        <>
        <div className="relative">
          {/* El `py-2` da aire al salto de 6 px que `column-card` hace en hover:
              `overflow-x-auto` obliga al eje vertical a `auto`, y sin ese espacio
              el navegador recortaría la tarjeta o sacaría una barra de más. */}
          <div
            ref={trackRef}
            onScroll={readReach}
            role="region"
            aria-label="Entregas a clientes"
            className="flex gap-px overflow-x-auto snap-x snap-mandatory py-2"
          >
            {visible.map((delivery, i) => (
              <button
                key={delivery.id}
                onClick={() => setOpenIndex(i)}
                style={{ animationDelay: `${Math.min(i, 11) * 55}ms` }}
                className="column-card animate-rise group text-left shrink-0 snap-start w-[68%] sm:w-[46%] lg:w-[31%] xl:w-[23.5%]"
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
                    sizes="(max-width: 640px) 68vw, (max-width: 1024px) 46vw, (max-width: 1280px) 31vw, 24vw"
                    className="w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent"
                  />

                  {/* Placa: la ubicación grabada sobre la foto */}
                  <div className="absolute inset-x-0 bottom-0 p-3.5">
                    {!delivery.locationInImage && (
                      <p className="flex items-center gap-1.5 text-lectura font-semibold text-marble leading-tight">
                        <MapPin className="w-3.5 h-3.5 text-silver shrink-0" />
                        {/* A 14px un barrio largo ya no cabe en una línea, y
                            cortarlo con puntos suspensivos borraba el dato. */}
                        <span className="line-clamp-2">
                          {delivery.neighborhood
                            ? `${delivery.neighborhood} · ${delivery.city}`
                            : delivery.city}
                        </span>
                      </p>
                    )}
                    <p className="mt-1 text-rotulo uppercase tracking-[0.2em] text-secundario truncate">
                      {formatMonthYear(delivery.deliveredAt)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Solo si de verdad hay recorrido, y solo en escritorio: en móvil se
              desliza con el dedo. Al llegar a un extremo la flecha se apaga en
              lugar de desaparecer, para que la fila no se mueva de lugar. */}
          {reach.overflows && (
            <>
              <button
                onClick={() => page(-1)}
                disabled={reach.atStart}
                aria-label="Ver entregas anteriores"
                className="hidden lg:flex absolute left-2 top-1/2 -translate-y-1/2 items-center justify-center w-11 h-11 border border-white/12 bg-obsidian/85 text-marble/70 hover:text-marble hover:border-silver/40 disabled:opacity-0 disabled:pointer-events-none transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => page(1)}
                disabled={reach.atEnd}
                aria-label="Ver más entregas"
                className="hidden lg:flex absolute right-2 top-1/2 -translate-y-1/2 items-center justify-center w-11 h-11 border border-white/12 bg-obsidian/85 text-marble/70 hover:text-marble hover:border-silver/40 disabled:opacity-0 disabled:pointer-events-none transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        <div className="h-px stylobate" />
        </>
      )}

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
              className="p-2 text-secundario hover:text-marble transition-colors"
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
                priority
                sizes="(max-width: 1024px) 96vw, 768px"
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
                  <p className="text-lectura text-marble/70">{active.productName}</p>
                )}
                {active.note && (
                  <p className="text-lectura text-terciario leading-relaxed">
                    {active.note}
                  </p>
                )}
                <p className="text-rotulo uppercase tracking-[0.24em] text-terciario">
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

/**
 * La fila curva de la portada: la entrega del centro al frente y las de los
 * lados bajando y girando apenas, como si estuvieran sobre un arco.
 *
 * El deslizamiento es el scroll nativo con `snap`, no un carrusel armado a
 * mano: con el dedo se siente como cualquier fila del teléfono y la inercia la
 * pone el sistema. Lo único que agrega JavaScript es la curva, que se calcula
 * de la posición real de cada tarjeta en cada cuadro de scroll. Con movimiento
 * reducido la curva no se aplica y queda una fila plana.
 */
function ArcoEntregas({
  entregas,
  onAbrir,
}: {
  entregas: Delivery[];
  onAbrir: (indice: number) => void;
}) {
  const pistaRef = useRef<HTMLDivElement>(null);
  const tarjetasRef = useRef<(HTMLButtonElement | null)[]>([]);
  const reducido = useMovimientoReducido();

  /* Se escribe el estilo directo en el nodo y no en el estado de React: esto
     corre en cada cuadro del scroll y un render por cuadro se nota en un
     teléfono de gama media. La transformación no mueve el centro horizontal
     de la tarjeta, así que medirla ya curvada no altera el cálculo. */
  const curvar = useCallback(() => {
    const pista = pistaRef.current;
    if (!pista) return;
    const caja = pista.getBoundingClientRect();
    const centro = caja.left + caja.width / 2;
    for (const tarjeta of tarjetasRef.current) {
      if (!tarjeta) continue;
      if (reducido) {
        tarjeta.style.transform = '';
        tarjeta.style.opacity = '';
        tarjeta.style.zIndex = '';
        continue;
      }
      const r = tarjeta.getBoundingClientRect();
      const d = (r.left + r.width / 2 - centro) / (r.width * 0.9);
      const a = Math.abs(d);
      const bajar = Math.min(30, a ** 1.4 * 12);
      const escala = Math.max(0.9, 1.03 - Math.min(0.12, a * 0.07));
      tarjeta.style.transform = `translateY(${bajar}px) rotate(${d * 4.5}deg) scale(${escala})`;
      tarjeta.style.opacity = String(Math.max(0.75, 1 - a * 0.1));
      tarjeta.style.zIndex = String(Math.round(50 - a * 10));
    }
  }, [reducido]);

  useEffect(() => {
    const pista = pistaRef.current;
    if (!pista) return;
    let cuadro = 0;
    const pedir = () => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(curvar);
    };
    pista.addEventListener('scroll', pedir, { passive: true });
    const observador = new ResizeObserver(pedir);
    observador.observe(pista);
    return () => {
      cancelAnimationFrame(cuadro);
      pista.removeEventListener('scroll', pedir);
      observador.disconnect();
    };
  }, [curvar, entregas.length]);

  /* Arranque: el relleno lateral que deja a la primera tarjeta llegar al
     centro también la deja sola, con media pista vacía a su izquierda; en
     escritorio eran 530 px de nada. Se arranca centrando la primera tarjeta
     que llena ese lado con las anteriores. El orden no cambia —la más reciente
     sigue primera— y se vuelve a ella deslizando. Va en `useLayoutEffect`
     para que el primer pintado ya salga en su sitio, sin un salto visible. */
  useLayoutEffect(() => {
    const pista = pistaRef.current;
    const tarjetas = tarjetasRef.current;
    const primera = tarjetas[0];
    if (!pista || !primera || entregas.length < 2) return;
    const paso = primera.offsetWidth + 18;
    const hueco = pista.clientWidth / 2 - primera.offsetWidth / 2;
    const k = Math.min(entregas.length - 1, Math.ceil(hueco / paso));
    const destino = tarjetas[k];
    if (!destino) return;
    pista.scrollLeft =
      destino.offsetLeft + destino.offsetWidth / 2 - pista.clientWidth / 2;
  }, [entregas.length]);

  const desplazar = (izquierda: number) =>
    pistaRef.current?.scrollBy({
      left: izquierda,
      behavior: reducido ? 'auto' : 'smooth',
    });

  /* Una tarjeta de lado primero se trae al centro; solo la del centro abre el
     visor. Así un toque para acercar la siguiente no tapa la pantalla. */
  const tocar = (indice: number) => {
    const pista = pistaRef.current;
    const tarjeta = tarjetasRef.current[indice];
    if (!pista || !tarjeta) return;
    const caja = pista.getBoundingClientRect();
    const r = tarjeta.getBoundingClientRect();
    const corrimiento = r.left + r.width / 2 - (caja.left + caja.width / 2);
    if (Math.abs(corrimiento) > r.width / 3) desplazar(corrimiento);
    else onAbrir(indice);
  };

  const paso = () => (tarjetasRef.current[0]?.offsetWidth ?? 280) + 18;

  return (
    <div className="relative -mx-5 lg:mx-0">
      {entregas.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => desplazar(-paso())}
            aria-label="Entrega anterior"
            className="hidden sm:flex absolute left-5 top-1/2 -translate-y-1/2 z-[60] w-11 h-11 items-center justify-center rounded-full border border-white/20 bg-obsidian/85 backdrop-blur text-marble hover:bg-marble hover:text-obsidian transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => desplazar(paso())}
            aria-label="Entrega siguiente"
            className="hidden sm:flex absolute right-5 top-1/2 -translate-y-1/2 z-[60] w-11 h-11 items-center justify-center rounded-full border border-white/20 bg-obsidian/85 backdrop-blur text-marble hover:bg-marble hover:text-obsidian transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* El relleno lateral de media pista menos media tarjeta es lo que deja
          a la primera y a la última llegar al centro. La máscara desvanece los
          extremos: sin ella las tarjetas de los lados se cortan en seco contra
          el borde del contenedor. */}
      <div
        ref={pistaRef}
        role="region"
        aria-label="Entregas a clientes"
        className="flex items-center gap-4.5 overflow-x-auto snap-x snap-mandatory no-scrollbar py-10 px-[calc(50%-120px)] sm:px-[calc(50%-140px)] [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]"
      >
        {entregas.map((entrega, i) => (
          <button
            key={entrega.id}
            ref={(nodo) => {
              tarjetasRef.current[i] = nodo;
            }}
            type="button"
            onClick={() => tocar(i)}
            aria-label={`Ver entrega en ${entrega.neighborhood || entrega.city}`}
            className="relative shrink-0 snap-center w-60 h-85 sm:w-70 sm:h-95 overflow-hidden rounded-tarjeta border border-white/14 bg-basalt text-left will-change-transform"
          >
            <SmartImage
              src={entrega.image}
              alt={
                entrega.productName
                  ? `${entrega.productName} entregado en ${entrega.city}`
                  : `Entrega en ${entrega.city}`
              }
              sizes="(max-width: 640px) 240px, 280px"
              className="w-full h-full object-cover"
            />
            <span className="absolute top-4 left-4 px-3.5 py-1.5 rounded-full border border-white/14 bg-obsidian/75 backdrop-blur text-rotulo font-semibold uppercase tracking-[0.12em] text-silver">
              {formatMonthYear(entrega.deliveredAt)}
            </span>
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-obsidian via-obsidian/80 to-transparent"
            />
            <div className="absolute inset-x-5 bottom-5">
              {!entrega.locationInImage && (
                <>
                  <span className="inline-block mb-2 px-2.5 py-1 rounded-full bg-marble text-obsidian text-rotulo font-bold uppercase tracking-[0.12em]">
                    {entrega.city}
                  </span>
                  {entrega.neighborhood && (
                    <p className="flex items-center gap-2 text-[15px] font-bold leading-tight text-marble">
                      <MapPin className="w-3.5 h-3.5 text-silver shrink-0" />
                      <span className="line-clamp-2">{entrega.neighborhood}</span>
                    </p>
                  )}
                </>
              )}
              {entrega.productName && (
                <p className="mt-1.5 text-lectura text-secundario truncate">
                  {entrega.productName}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
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
          <p className="text-rotulo uppercase tracking-[0.2em] text-terciario truncate">
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
