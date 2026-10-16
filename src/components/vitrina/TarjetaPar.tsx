import { Link } from 'react-router-dom';
import type { Sneaker } from '../../types';
import { useStore } from '../../context/StoreContext';
import { TenisFlotante } from './TenisFlotante';
import { cx, discountPercent, formatPrice } from '../../lib/utils';

/** Días que un par lleva la etiqueta de "Nuevo" desde que entró. */
const DIAS_DE_NUEVO = 21;

/**
 * El generador marca `isNewArrival` en todos los pares, así que por sí solo no
 * distingue nada: con él, "Nuevo" salía en las 616 tarjetas. Se cruza con la
 * fecha de llegada para que la etiqueta vuelva a significar algo.
 */
function esNuevo(s: Sneaker): boolean {
  const dias = (Date.now() - new Date(s.createdAt).getTime()) / 86_400_000;
  return s.isNewArrival && dias <= DIAS_DE_NUEVO;
}

interface TarjetaParProps {
  sneaker: Sneaker;
  /** Lo que mide la tarjeta en pantalla, para que el navegador pida la foto justa. */
  sizes: string;
  priority?: boolean;
  className?: string;
}

/**
 * Un par en vitrina: el tenis flotando arriba y una placa con lo que decide la
 * compra abajo. La usan la cuadrícula del catálogo y los carruseles, para que
 * un par se vea igual donde se lo encuentre.
 *
 * El rótulo de la línea va siempre, también en el celular. En la cuadrícula de
 * una sola línea sobra, pero la tarjeta no sabe dónde la pusieron, y en una
 * fila que junta las dos es lo único que impide que un par de uso diario se
 * lea como verificado.
 *
 * En un teléfono la tarjeta mide unos 175 px, así que se queda con foto, línea,
 * nombre y precio. El color y el estado aparecen desde `sm`, salvo un estado
 * que cambie la decisión (bajo encargo o agotado), que se dice siempre.
 */
export function TarjetaPar({ sneaker, sizes, priority = false, className }: TarjetaParProps) {
  const { settings } = useStore();
  const original = sneaker.category === 'originales';
  const agotado = sneaker.status === 'agotado';
  const descuento = discountPercent(sneaker);
  const marca = sneaker.brand === 'Otras' ? 'Otras marcas' : sneaker.brand;

  return (
    <Link
      to={`/producto/${sneaker.id}`}
      className={cx(
        'group flex flex-col bg-basalt hover:bg-marble-navy transition-colors duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-silver',
        className,
      )}
    >
      {/* La foto va en posición absoluta dentro del recuadro: con `h-full`
          dentro de un `aspect-ratio`, una foto vertical estiraba la tarjeta a
          su propia altura y la fila quedaba despareja. */}
      <div className="relative aspect-[4/3]">
        <div className="absolute inset-3 sm:inset-5">
          <TenisFlotante sneaker={sneaker} sizes={sizes} priority={priority} />
        </div>

        {descuento && !agotado && (
          <span className="absolute top-0 right-0 bg-lapis text-marble text-[9px] font-bold px-1.5 py-1">
            −{descuento}%
          </span>
        )}
        {esNuevo(sneaker) && !agotado && (
          <span className="absolute top-0 left-0 bg-marble text-obsidian text-[8px] font-bold uppercase tracking-[0.2em] px-2 py-1">
            Nuevo
          </span>
        )}
      </div>

      <div className="mt-auto px-3 sm:px-3.5 pb-3 sm:pb-3.5 pt-2.5 border-t border-white/6 space-y-1.5">
        <span
          className={cx(
            'block text-[8px] font-bold uppercase tracking-[0.24em]',
            original ? 'text-silver' : 'text-lapis-lit',
          )}
        >
          {original ? 'Original · Legit' : 'Sneakers'}
        </span>

        <p className="font-body font-semibold text-[12px] sm:text-[13px] leading-snug text-marble line-clamp-2 min-h-[2.1rem] sm:min-h-[2.3rem]">
          {sneaker.name}
        </p>

        <p className="hidden sm:block text-[9px] uppercase tracking-[0.18em] text-marble/40 truncate">
          {marca}
          {sneaker.details.colorway && ` · ${sneaker.details.colorway}`}
        </p>

        <div className="flex items-end justify-between gap-2 pt-1">
          {agotado ? (
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-marble/40">
              Agotado
            </span>
          ) : (
            <span className="leading-none">
              <span className="font-display text-[17px] sm:text-lg text-marble">
                {formatPrice(sneaker.price, settings.currency, settings.currencySymbol)}
              </span>
              {sneaker.originalPrice && sneaker.originalPrice > sneaker.price && (
                <span className="block text-[10px] text-marble/30 line-through mt-1">
                  {formatPrice(sneaker.originalPrice, settings.currency, settings.currencySymbol)}
                </span>
              )}
            </span>
          )}
          {sneaker.status === 'bajo_encargo' && (
            <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-silver/70 text-right">
              Bajo encargo
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * La cuadrícula del catálogo. Rejilla de un píxel, como el resto de la casa:
 * las tarjetas se separan con la línea del fondo, no con sombras.
 */
export function GrillaVitrina({ sneakers }: { sneakers: Sneaker[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-white/8 border border-white/8">
      {sneakers.map((s, i) => (
        <TarjetaPar
          key={s.id}
          sneaker={s}
          sizes="(max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          /* La primera fila de escritorio, que en móvil son las dos primeras:
             es lo que se ve sin desplazar y lo que el navegador cronometra
             como primera pintada grande. */
          priority={i < 4}
        />
      ))}
    </div>
  );
}
