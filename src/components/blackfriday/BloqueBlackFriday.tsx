import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { PRECIO_BLACK_FRIDAY, entraABlackFriday } from '../../lib/temporada';
import { formatPrice } from '../../lib/utils';
import { SIN_FLOTANTE } from '../../hooks/useFranjaDelFlotante';
import { CuentaRegresiva } from './CuentaRegresiva';

/**
 * El bloque de campaña de la portada: Black Friday en la línea Sneakers.
 *
 * Negro sobre negro, que es lo que dice el nombre, con el metal grabado de la
 * casa en el título y un solo acento lapislázuli. El brillo que cruza "BLACK
 * FRIDAY" es la única animación (`.titulo-bf` en `index.css`): pieza de
 * campaña, se ve pocas veces, y la cuenta regresiva de al lado no se anima.
 *
 * El tenis es un recorte de la línea Sneakers, a propósito: el bloque vende
 * esa línea, y un par verificado ahí sugeriría que la rebaja lo incluye.
 */
export function BloqueBlackFriday() {
  const { sneakers, settings } = useStore();
  const enCampana = sneakers.filter(entraABlackFriday);
  if (!enCampana.length) return null;

  const desde = Math.min(...enCampana.map((s) => s.price));
  const precio = formatPrice(PRECIO_BLACK_FRIDAY, settings.currency, settings.currencySymbol);

  return (
    <section
      aria-labelledby="titulo-black-friday"
      className="max-w-[1400px] mx-auto px-5 lg:px-8 pt-14 sm:pt-20"
    >
      <div
        className="relative overflow-hidden rounded-sala border border-white/10 px-6 py-10 sm:px-12 sm:py-14"
        style={{
          background:
            'radial-gradient(ellipse 60% 70% at 85% 100%, rgb(30 58 138 / 0.35), transparent 70%), radial-gradient(ellipse 50% 60% at 10% 0%, rgb(200 200 200 / 0.06), transparent 70%), #070707',
        }}
      >
        {/* Retícula fina, quieta y por debajo de todo. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.06)_1px,transparent_1px)] bg-[length:22px_22px]"
        />

        <div className="relative grid items-center gap-10 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <p className="text-rotulo font-bold uppercase tracking-[0.3em] text-lapis-texto">
              Solo hasta el 30 de noviembre
            </p>

            <h2
              id="titulo-black-friday"
              className="titulo-bf mt-4 font-display text-engraved text-[clamp(60px,13vw,150px)] leading-[0.9]"
            >
              Black
              <br />
              Friday
            </h2>

            <p className="mt-6 text-lectura sm:text-base text-secundario max-w-md leading-relaxed">
              Toda la línea Sneakers, {enCampana.length} pares, a un solo precio.
              Antes desde {formatPrice(desde, settings.currency, settings.currencySymbol)}.
            </p>
            <p className="mt-2 font-display text-[clamp(44px,8vw,76px)] leading-none text-marble">
              {precio}
            </p>

            <CuentaRegresiva className="mt-8" />

            <div
              {...{ [SIN_FLOTANTE]: '' }}
              className="mt-9 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <Link to="/sneakers" className="btn group">
                Ver los Sneakers a {precio}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <p className="mt-5 text-lectura text-terciario max-w-md">
              Precio por par hasta el 30 de noviembre a las 11:59 p. m. Los
              Originales conservan su precio.
            </p>
          </div>

          {/* El tenis flota a la derecha en escritorio y queda abajo en el
              celular. La sombra es la de piso, la única permitida. */}
          <div aria-hidden className="relative mx-auto w-full max-w-[460px]">
            <img
              src="/recortes/sneakers/nike-dunk-low-unc.webp"
              alt=""
              loading="lazy"
              decoding="async"
              className="relative z-[1] w-full -rotate-[8deg] drop-shadow-[0_28px_26px_rgba(0,0,0,0.85)]"
            />
            <div className="mx-auto -mt-4 h-5 w-[70%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.75)_0%,rgba(0,0,0,0)_72%)]" />
            {/* La etiqueta del precio, como la de una vitrina. */}
            <span className="absolute right-2 top-2 sm:right-6 sm:top-4 z-[2] rotate-[6deg] rounded-full bg-lapis px-4 py-2 font-display text-2xl sm:text-3xl text-marble">
              {precio}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
