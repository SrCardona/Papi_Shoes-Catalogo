import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import type { Sneaker } from '../../types';
import { useStore } from '../../context/StoreContext';
import { SmartImage } from './SmartImage';
import { NO_ES_MARCA } from '../../lib/marcas';
import {
  cx,
  discountPercent,
  fondoDeFoto,
  formatPrice,
  generateWhatsAppLink,
} from '../../lib/utils';

const STATUS_LABEL = {
  disponible: 'Entrega inmediata',
  bajo_encargo: 'Bajo encargo',
  agotado: 'Agotado',
} as const;

const LINEA_LABEL = { originales: 'Originales', general: 'Sneakers' } as const;

/* Compartido por la foto y su fondo difuminado: si difieren, el navegador
   puede escoger otro ancho del `srcset` y el fondo costaría una descarga. */
const TAMANOS_FOTO = '(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw';

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
  const esOtras = sneaker.brand === NO_ES_MARCA;

  const fondo = fondoDeFoto(sneaker.images[0]);

  return (
    <article
      className="column-card animate-rise group flex flex-col"
      style={{ animationDelay: `${Math.min(index, 11) * 55}ms` }}
    >
      <Link
        to={`/producto/${sneaker.id}`}
        className="flex flex-1 flex-col rounded-foto focus:outline-none focus-visible:ring-1 focus-visible:ring-silver"
      >
        {/* La foto entera, nunca recortada: el catálogo se surte de fotos de
            proveedor muy apaisadas y un recorte a cuadrado se comía la puntera
            o el talón. Para que la celda no quede con franjas, se pinta del
            color de los bordes de la foto (`npm run catalogo` lo calcula) y la
            foto se funde con ella. Una foto con escena no tiene un color que
            la continúe: ahí la celda se llena con la misma foto, ampliada,
            difuminada y oscurecida, y la foto entera va encima. Sin eso 360
            portadas quedaban con franjas negras a los lados o arriba y abajo. */}
        <div
          className={cx(
            'relative aspect-square overflow-hidden rounded-foto bg-obsidian',
            isSoldOut && 'opacity-45',
          )}
          style={fondo ? { background: fondo } : undefined}
        >
          {/* Mismo `src` y mismo `sizes` que la foto de encima: el navegador
              escoge el mismo ancho del `srcset` y lo sirve de la caché, así que
              el fondo no descarga nada. El difuminado va en el contenedor
              porque `SmartImage` maneja su propia opacidad para el fundido. */}
          {!fondo && (
            <div aria-hidden className="absolute inset-0 scale-125 blur-xl brightness-[0.45]">
              <SmartImage
                src={sneaker.images[0]}
                alt=""
                priority={priority}
                sizes={TAMANOS_FOTO}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {/* Al pasar el cursor la foto crece un poco, nada más. `hover:` ya
              solo existe donde hay cursor, y `motion-safe:` deja quieto el
              par a quien pidió menos movimiento. */}
          <SmartImage
            src={sneaker.images[0]}
            alt={sneaker.name}
            priority={priority}
            sizes={TAMANOS_FOTO}
            className="relative w-full h-full object-contain motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:scale-[1.04]"
          />
        </div>

        <div className="flex flex-1 flex-col gap-1.5 px-1.5 sm:px-2.5 pt-3.5 sm:pt-4">
          {/* En el celular marca y línea van en renglones propios: "Louis
              Vuitton · Sneakers" no cabe en 147 px y se partía con el punto
              colgando al final. Desde `sm` caben juntas con el punto.

              "Otras" es la etiqueta del generador para las marcas sueltas, no
              una marca: la real ya va en el nombre del par. Ahí sale solo la
              línea, que es lo que no se puede omitir. */}
          <p className="flex flex-col sm:flex-row sm:flex-wrap sm:gap-x-2 text-rotulo uppercase tracking-[0.1em] sm:tracking-[0.2em] text-terciario">
            {!esOtras && <span>{sneaker.brand}</span>}
            {!esOtras && (
              <span aria-hidden className="hidden sm:inline">
                ·
              </span>
            )}
            <span className={cx(lineaUnica && !esOtras && 'hidden sm:inline')}>
              {LINEA_LABEL[sneaker.category]}
            </span>
          </p>

          <div>
            {/* Sin alto reservado: el colorway va pegado al nombre, y el precio
                cae a la misma altura en toda la fila porque baja con `mt-auto`. */}
            <h3 className="font-body font-semibold text-lectura sm:text-base leading-snug text-marble line-clamp-2 normal-case tracking-normal">
              {sneaker.name}
            </h3>
            {/* Hasta dos líneas: a 14 px en una tarjeta de celular casi ningún
                colorway cabe en una, y cortarlo con puntos suspensivos se comía
                justo el color que distingue el par. */}
            {colorway && (
              <p className="text-lectura leading-snug text-secundario line-clamp-2">
                {colorway}
              </p>
            )}
          </div>

          {/* Disponibilidad y precio van juntos al fondo de la tarjeta, en ese
              orden: lo que cambia de alto de un par a otro —una o dos líneas
              de estado, con o sin precio anterior— queda arriba, y el precio
              grande cae siempre a la misma distancia del botón. Así una fila
              alinea sus precios sin reservar líneas vacías. */}
          <div className="mt-auto flex flex-col pt-1.5">
            {/* La disponibilidad en gris, como texto: sin verde ni ícono de
                estado. Cada dato entero o a la línea siguiente, nunca partido. */}
            <p className="flex flex-wrap content-start gap-x-3 gap-y-1 pt-3 border-t border-white/10 whitespace-nowrap text-rotulo uppercase tracking-[0.04em] sm:tracking-[0.14em] text-terciario">
              {esNuevo(sneaker) && !isSoldOut && <span className="text-secundario">Nuevo</span>}
              <span>{STATUS_LABEL[sneaker.status]}</span>
              {isVerified && <span>Verificado</span>}
            </p>

            {/* En el celular el precio anterior y el descuento van en su propia
                línea, encima del precio: en 147 px los tres no caben en una
                fila y la letra no se achica. Desde `sm` van en la misma. */}
            <p className="mt-2.5 flex flex-col-reverse gap-y-1 sm:flex-row sm:items-baseline sm:gap-x-2 whitespace-nowrap">
              <span className="font-display text-xl sm:text-[26px] leading-none text-marble">
                {formatPrice(sneaker.price, settings.currency, settings.currencySymbol)}
              </span>
              {discount && sneaker.originalPrice && (
                <span className="flex items-baseline gap-x-2">
                  <span className="text-lectura text-terciario line-through">
                    {formatPrice(sneaker.originalPrice, settings.currency, settings.currencySymbol)}
                  </span>
                  <span className="text-lectura text-secundario tabular-nums">−{discount}%</span>
                </span>
              )}
            </p>
          </div>
        </div>
      </Link>

      {/* Fuera del enlace de la ficha: un enlace no puede ir dentro de otro.
          Sale sin talla ("por confirmar"), con la plantilla de la tienda; la
          talla se elige en la ficha. También en un par agotado: se puede
          traer bajo encargo, y sin el botón su precio quedaría más abajo que
          el del resto de la fila. En el celular la tarjeta mide 147 px por
          dentro y la frase entera no cabe a 12 px: ahí queda "Pedir" con el
          ícono, que se lee igual. */}
      <a
        href={generateWhatsAppLink(sneaker, null, settings)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Pedir ${sneaker.name} por WhatsApp`}
        className="btn mt-3 mx-0.5 mb-0.5 gap-2 px-3 sm:px-5 py-3 sm:py-[13px] tracking-[0.12em] sm:tracking-[0.18em]"
      >
        <MessageCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
        <span className="sm:hidden">Pedir</span>
        <span className="hidden sm:inline">Pedir por WhatsApp</span>
      </a>
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
