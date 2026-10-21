import { Link } from 'react-router-dom';
import type { Sneaker } from '../../types';
import { useStore } from '../../context/StoreContext';
import { SmartImage } from './SmartImage';
import { cx, discountPercent, formatPrice } from '../../lib/utils';

const STATUS_LABEL = {
  disponible: 'Entrega inmediata',
  bajo_encargo: 'Bajo encargo',
  agotado: 'Agotado',
} as const;

const LINEA_LABEL = { originales: 'Originales', general: 'Sneakers' } as const;

/* El generador marca `isNewArrival` en todos los pares, así que por sí solo no
   dice nada: "Nuevo" en las 616 tarjetas es ruido. Lo que separa un par recién
   llegado es la fecha de `catalogo/llegadas.json`, que viaja en `createdAt`. */
const DIAS_DE_NUEVO = 21;
const MS_POR_DIA = 86_400_000;

function esNuevo(s: Sneaker): boolean {
  if (!s.isNewArrival) return false;
  const llegada = Date.parse(s.createdAt);
  return Number.isFinite(llegada) && Date.now() - llegada <= DIAS_DE_NUEVO * MS_POR_DIA;
}

interface SneakerColumnProps {
  sneaker: Sneaker;
  /** Retardo escalonado para la entrada de la columnata. */
  index?: number;
  /** Las de la primera fila cargan sin diferir: son las que miden el LCP. */
  priority?: boolean;
  /** Todas las tarjetas de la cuadrícula son de la misma línea (las páginas
      de Originales y Sneakers, los pares parecidos de una ficha). */
  lineaUnica?: boolean;
}

/**
 * Cada producto es su propia celda: la foto sola arriba y todo lo que la
 * describe debajo, como la cartela de una pieza de museo.
 *
 * Nada va encima de la foto. Las etiquetas sobre la imagen tapaban justo la
 * puntera o el talón, que es lo que se mira para reconocer el par, y en un
 * teléfono de 175 px de tarjeta se comían un cuarto del tenis.
 *
 * Donde se mezclan las dos líneas (portada, catálogo completo, búsqueda) la
 * línea sale en toda tarjeta, también en el celular: es lo único que impide
 * leer un par de uso diario como verificado. En una cuadrícula de una sola
 * línea el encabezado de la página ya la dice, y en un celular la fila
 * "Louis Vuitton · Sneakers" no cabe: ahí queda solo la marca. Por lo mismo,
 * "Verificado" solo existe en Originales.
 */
export function SneakerColumn({
  sneaker,
  index = 0,
  priority = false,
  lineaUnica = false,
}: SneakerColumnProps) {
  const { settings } = useStore();
  const discount = discountPercent(sneaker);
  const isOriginal = sneaker.category === 'originales';
  const isVerified = isOriginal && sneaker.isOriginalCertified;
  const isSoldOut = sneaker.status === 'agotado';
  const colorway = sneaker.details.colorway.trim();

  return (
    <article
      className="column-card animate-rise group"
      style={{ animationDelay: `${Math.min(index, 11) * 55}ms` }}
    >
      <Link
        to={`/producto/${sneaker.id}`}
        className="flex flex-col h-full focus:outline-none focus-visible:ring-1 focus-visible:ring-silver"
      >
        {/* La foto entera sobre estriado.
            Iba recortada a cuadrado para que la columnata quedara pareja, pero
            el catálogo se surte de fotos de proveedor muy apaisadas y el
            recorte se comía el par: en la línea Originales, 80 de 88 fotos
            perdían un tercio o más y la tarjeta enseñaba media puntera. Un par
            que no se reconoce no se abre, así que manda verlo completo y el
            cuadro se rellena con el estriado. */}
        <div
          className={cx(
            'relative aspect-square overflow-hidden bg-obsidian fluted',
            isSoldOut && 'opacity-45',
          )}
        >
          {/* Al pasar el cursor el tenis sube, nada más. `hover:` ya solo
              existe donde hay cursor, y `motion-safe:` deja quieto el par a
              quien pidió menos movimiento. */}
          <SmartImage
            src={sneaker.images[0]}
            alt={sneaker.name}
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="w-full h-full object-contain motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:-translate-y-1.5"
          />
        </div>

        <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4 border-t border-white/8">
          <p className="flex flex-wrap gap-x-2 text-rotulo uppercase tracking-[0.1em] sm:tracking-[0.18em] text-terciario">
            <span>{sneaker.brand}</span>
            <span aria-hidden className={cx(lineaUnica && 'hidden sm:inline')}>·</span>
            <span className={cx(lineaUnica && 'hidden sm:inline')}>
              {LINEA_LABEL[sneaker.category]}
            </span>
          </p>

          <div>
            {/* Sin alto reservado: el colorway va pegado al nombre, y el precio
                cae a la misma altura en toda la fila porque baja con `mt-auto`. */}
            <h3 className="font-body font-semibold text-lectura leading-snug text-marble line-clamp-2 normal-case tracking-normal">
              {sneaker.name}
            </h3>
            {/* Hasta dos líneas: a 14 px en una tarjeta de celular casi ningún
                colorway cabe en una, y cortarlo con puntos suspensivos se comía
                justo el color que distingue el par. El precio no se descuadra
                porque baja con `mt-auto`. */}
            {colorway && (
              <p className="text-lectura leading-snug text-secundario line-clamp-2">
                {colorway}
              </p>
            )}
          </div>

          {/* Precio y disponibilidad van juntos al fondo de la tarjeta. Para
              que en una fila los precios queden a la misma altura, la
              disponibilidad reserva en el celular sus dos líneas aunque use
              una: "Nuevo" y "Entrega inmediata" no caben lado a lado y, si no,
              la tarjeta que dice "Nuevo" subiría su precio. */}
          <div className="mt-auto flex flex-col gap-2 pt-1">
            {/* En una sola fila. En el celular las tres cifras miden unos 170 px
                y la tarjeta deja 141, así que ahí se queda sin el precio
                anterior: el descuento ya dice cuánto se ahorra, y el tachado
                sigue en escritorio y en la ficha. La letra no se achica. */}
            <p className="flex flex-nowrap items-baseline gap-x-2 whitespace-nowrap">
              <span className="font-display text-[17px] sm:text-lg text-marble">
                {formatPrice(sneaker.price, settings.currency, settings.currencySymbol)}
              </span>
              {discount && sneaker.originalPrice && (
                <>
                  <span className="hidden sm:inline text-lectura text-terciario line-through">
                    {formatPrice(sneaker.originalPrice, settings.currency, settings.currencySymbol)}
                  </span>
                  <span className="text-lectura text-secundario tabular-nums">−{discount}%</span>
                </>
              )}
            </p>

            {/* Cada dato entero o a la línea siguiente, nunca partido. */}
            <p className="flex flex-wrap content-start gap-x-3 gap-y-1 min-h-[calc(3em+0.25rem)] sm:min-h-0 whitespace-nowrap text-rotulo uppercase tracking-[0.04em] sm:tracking-[0.14em] text-terciario">
              {esNuevo(sneaker) && !isSoldOut && <span className="text-secundario">Nuevo</span>}
              <span>{STATUS_LABEL[sneaker.status]}</span>
              {isVerified && <span>Verificado</span>}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}

/** La columnata: cuadrícula de productos, una celda por par. */
export function Colonnade({
  sneakers,
  lineaUnica = false,
}: {
  sneakers: Sneaker[];
  lineaUnica?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
      {sneakers.map((sneaker, i) => (
        <SneakerColumn
          key={sneaker.id}
          sneaker={sneaker}
          index={i}
          lineaUnica={lineaUnica}
          /* La primera fila de escritorio, que en móvil son las dos
             primeras: es lo que se ve sin desplazar y lo que el navegador
             cronometra como primera pintada grande. */
          priority={i < 4}
        />
      ))}
    </div>
  );
}
