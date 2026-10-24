import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { useMarcasAgrupadas } from '../../hooks/useMarcasPorLinea';
import { useMovimientoReducido } from '../../hooks/useMovimientoReducido';
import { MARCA_OTRAS } from '../../lib/marcas';
import { cx } from '../../lib/utils';

/**
 * Los recortes del hero, en el orden en que rotan. Cada uno se aprobó a mano
 * mirando la hoja al 100 %: no se agregan sacándolos del catálogo, porque una
 * foto de proveedor sin recortar sobre el negro se ve como un pegote.
 *
 * Se enlazan por id y no por nombre: el nombre lo puede cambiar el dueño desde
 * el panel, y entonces el hero mostraría uno y llevaría a otro.
 */
const RECORTES: { id: string; src: string }[] = [
  { id: 'sneaker-nike-air-max-tn-plus-blue-gray', src: '/recortes/originales/nike-air-max-tn-plus-blue-gray.webp' },
  { id: 'sneaker-nike-vomero-6-gold', src: '/recortes/originales/nike-vomero-6-gold.webp' },
  { id: 'sneaker-puma-rebound', src: '/recortes/originales/puma-rebound.webp' },
  { id: 'sneaker-nike-cortez-forrest-gump', src: '/recortes/sneakers/nike-cortez-forrest-gump.webp' },
  { id: 'sneaker-nike-dunk-low-unc', src: '/recortes/sneakers/nike-dunk-low-unc.webp' },
  { id: 'sneaker-adidas-campus-00s-gray', src: '/recortes/sneakers/adidas-campus-00s-gray.webp' },
];

const INTERVALO_MS = 5000;

function usePestanaVisible(): boolean {
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const cambiar = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', cambiar);
    return () => document.removeEventListener('visibilitychange', cambiar);
  }, []);
  return visible;
}

/**
 * El tenis que flota sobre "EL TEMPLO". Rota cada cinco segundos con un
 * fundido, y se queda quieto cuando nadie lo puede mirar con calma: con el
 * puntero o el foco encima, con la pestaña al fondo y, siempre, con
 * movimiento reducido.
 */
export function HeroRotativo() {
  const { sneakers } = useStore();
  const agrupadas = useMarcasAgrupadas();
  const reducido = useMovimientoReducido();
  const pestanaVisible = usePestanaVisible();
  const [actual, setActual] = useState(0);
  const [encima, setEncima] = useState(false);

  /* Un par que el dueño quitó desde el panel sale de la rotación en vez de
     dejar un enlace a una ficha que ya no existe. */
  const pares = useMemo(() => {
    const porId = new Map(sneakers.map((s) => [s.id, s]));
    return RECORTES.flatMap(({ id, src }) => {
      const par = porId.get(id);
      if (!par) return [];
      const originales = par.category === 'originales';
      const linea = originales ? 'originales' : 'general';
      /* Mismo reparto que el menú: si la marca no tiene apartado propio en
         esa línea, su sección es "Otras marcas" y no un filtro suelto. */
      const propia = agrupadas[linea].principales.some((m) => m.brand === par.brand);
      const marca = propia ? encodeURIComponent(par.brand) : MARCA_OTRAS;
      return [
        {
          id,
          src,
          nombre: par.name,
          linea: originales ? 'Originales' : 'Sneakers',
          to: `${originales ? '/originales' : '/sneakers'}?marca=${marca}`,
        },
      ];
    });
  }, [sneakers, agrupadas]);

  const total = pares.length;
  const indice = total ? actual % total : 0;
  const rota = total > 1 && !reducido && !encima && pestanaVisible;

  /* Un `setTimeout` por vuelta y no un intervalo fijo: al soltar la pausa o
     elegir un punto, el siguiente cambio vuelve a contar cinco segundos
     enteros en lugar de caer a destiempo. */
  useEffect(() => {
    if (!rota) return;
    const t = window.setTimeout(() => setActual((i) => (i + 1) % total), INTERVALO_MS);
    return () => window.clearTimeout(t);
  }, [rota, indice, total]);

  if (!total) return null;
  const par = pares[indice];

  return (
    <div
      className="relative z-[2] w-[min(86%,520px)] -mt-[clamp(24px,6vw,60px)] flex flex-col items-center"
      onMouseEnter={() => setEncima(true)}
      onMouseLeave={() => setEncima(false)}
      onFocus={() => setEncima(true)}
      onBlur={() => setEncima(false)}
    >
      {/* Todos montados y apilados en la misma celda: así la siguiente foto ya
          está descargada cuando le toca, y el fundido no muestra un hueco.
          La caja tiene proporción fija y los tenis se asientan abajo, para que
          la sombra de piso no salte de altura con cada par. Es 2:1 porque así
          miden casi todos los recortes (2,1 a 2,3): en una caja más alta los
          de perfil dejaban vacío el tercio de arriba y no alcanzaban a montar
          sobre el nombre. Los más altos (Campus, Puma) llegan arriba por
          altura y quedan más angostos. */}
      <Link
        to={par.to}
        aria-label={`${par.nombre}: ver más de la línea ${par.linea}`}
        className="relative block w-full max-w-[480px] aspect-[2/1]"
      >
        {pares.map((p, i) => (
          <img
            key={p.id}
            src={p.src}
            alt={i === indice ? p.nombre : ''}
            aria-hidden={i !== indice}
            decoding="async"
            fetchPriority={i === 0 ? 'high' : 'low'}
            className={cx(
              'absolute inset-0 w-full h-full object-contain object-bottom transition-opacity duration-700 ease-out drop-shadow-[0_25px_30px_rgba(0,0,0,0.85)]',
              i === indice ? 'opacity-100' : 'opacity-0',
            )}
          />
        ))}
      </Link>
      <div
        aria-hidden
        className="w-[65%] max-w-[320px] h-4 -mt-1.5 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.7)_0%,rgba(0,0,0,0)_72%)] pointer-events-none"
      />

      <p className="mt-3 text-rotulo font-semibold uppercase tracking-[0.18em] text-terciario">
        {par.nombre} · {par.linea}
      </p>

      {total > 1 && (
        /* Cada botón mide 44 px reales y van pegados: con `.tap` el área crecía
           por fuera del botón y, a 22 px de distancia, se pisaban entre vecinos. */
        <div className="mt-1 flex items-center">
          {pares.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActual(i)}
              aria-label={`Ver ${p.nombre}`}
              aria-current={i === indice}
              className="w-11 h-11 flex items-center justify-center"
            >
              <span
                className={cx(
                  'block h-1.5 rounded-full transition-all duration-500',
                  i === indice ? 'w-5 bg-marble' : 'w-1.5 bg-white/25',
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
