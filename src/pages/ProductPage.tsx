import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Instagram,
  MessageCircle,
  Ruler,
  Share2,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { SmartImage } from '../components/ui/SmartImage';
import { SizeGuide } from '../components/ui/SizeGuide';
import { Colonnade } from '../components/ui/SneakerColumn';
import { SectionHeader } from '../components/ui/SectionHeader';
import {
  cx,
  discountPercent,
  fondoDeFoto,
  formatPrice,
  generateDirectWhatsAppContact,
  generateWhatsAppLink,
  instagramUrl,
} from '../lib/utils';

/* Compartido por la foto grande y su fondo difuminado: con el mismo `sizes`
   el navegador escoge el mismo ancho y el fondo no descarga nada. */
const TAMANOS_GALERIA = '(max-width: 1024px) 100vw, 640px';

/**
 * Al pasar de un producto a otro hay que reiniciar la foto y la talla elegidas.
 * Se hace con `key` en lugar de un efecto: React desmonta y vuelve a montar el
 * componente, y el estado nace limpio sin renders en cascada.
 */
export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  return <ProductView key={id} id={id} />;
}

function ProductView({ id }: { id?: string }) {
  const navigate = useNavigate();
  const { getSneaker, sneakers, settings } = useStore();

  const sneaker = id ? getSneaker(id) : undefined;
  const igUrl = instagramUrl(settings.instagramHandle);

  const [imageIndex, setImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | number | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // SEO: cada producto tiene su propio título y descripción.
  useEffect(() => {
    if (!sneaker) return;
    const previousTitle = document.title;
    document.title = `${sneaker.name} — ${settings.storeName}`;
    return () => {
      document.title = previousTitle;
    };
  }, [sneaker, settings.storeName]);

  const related = useMemo(() => {
    if (!sneaker) return [];
    return sneakers
      .filter((s) => s.id !== sneaker.id && s.category === sneaker.category)
      .slice(0, 4);
  }, [sneakers, sneaker]);

  if (!sneaker) {
    return (
      <div className="max-w-md mx-auto px-6 py-32 text-center space-y-6">
        <h1 className="font-display text-4xl text-marble">Este par ya no está</h1>
        <p className="text-lectura text-secundario leading-relaxed">
          Puede que se haya vendido o que el enlace esté desactualizado. Mira el
          catálogo completo o pídelo bajo encargo.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-1">
          <button onClick={() => navigate('/catalogo')} className="btn">
            Ver catálogo
          </button>
          <a
            href={generateDirectWhatsAppContact(settings, 'Un par que ya no aparece en el sitio')}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
          >
            Preguntar
          </a>
        </div>
      </div>
    );
  }

  const discount = discountPercent(sneaker);
  const fondoFoto = fondoDeFoto(sneaker.images[imageIndex]);
  const isOriginal = sneaker.category === 'originales';
  const isSoldOut = sneaker.status === 'agotado';

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: sneaker.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      }
    } catch {
      /* el usuario canceló el diálogo de compartir */
    }
  };

  return (
    <>
      {/* Migas de pan */}
      <nav
        aria-label="Ruta de navegación"
        className="max-w-[1400px] mx-auto px-5 lg:px-8 pt-7 pb-5"
      >
        <div className="flex items-center gap-2 text-rotulo uppercase tracking-[0.18em] text-terciario">
          <Link to="/" className="hover:text-marble transition-colors">
            Inicio
          </Link>
          <span>/</span>
          <Link
            to={isOriginal ? '/originales' : '/sneakers'}
            className="hover:text-marble transition-colors"
          >
            {isOriginal ? 'Originales' : 'Sneakers'}
          </Link>
          <span>/</span>
          <span className="text-secundario truncate max-w-[45vw]">{sneaker.brand}</span>
        </div>
      </nav>

      {/* El padding extra deja pasar la barra fija de móvil sin taparle el
          final a la página. */}
      <article className="max-w-[1400px] mx-auto px-5 lg:px-8 pb-32 sm:pb-20">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          {/* ── Galería ────────────────────────────────────────────── */}
          <div className="space-y-3">
            {/* Aquí la foto se ve entera, no recortada: es la pantalla donde se
                decide la compra y el catálogo trae fotos muy apaisadas —hay de
                430x211, que en un cuadro cuadrado perdían la mitad—. El marco
                sigue siendo cuadrado para que la página no salte al cambiar de
                foto. Lo que sobra se llena igual que en la tarjeta del
                catálogo: con el color de los bordes de la foto si lo tiene, o
                con la misma foto difuminada si es una escena. */}
            <div
              className="relative aspect-square overflow-hidden rounded-tarjeta border border-white/8 bg-basalt"
              style={fondoFoto ? { background: fondoFoto } : undefined}
            >
              {!fondoFoto && (
                <div aria-hidden className="absolute inset-0 scale-125 blur-2xl brightness-[0.45]">
                  {/* Mismo `src` y `sizes` que la foto de encima: sale de la caché. */}
                  <SmartImage
                    src={sneaker.images[imageIndex]}
                    alt=""
                    priority
                    sizes={TAMANOS_GALERIA}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <SmartImage
                src={sneaker.images[imageIndex]}
                alt={`${sneaker.name} — vista ${imageIndex + 1}`}
                priority
                sizes={TAMANOS_GALERIA}
                className="relative w-full h-full object-contain"
              />

              {sneaker.images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setImageIndex(
                        (i) => (i - 1 + sneaker.images.length) % sneaker.images.length,
                      )
                    }
                    aria-label="Foto anterior"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full border border-white/20 bg-obsidian/85 backdrop-blur text-marble hover:bg-marble hover:text-obsidian flex items-center justify-center transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      setImageIndex((i) => (i + 1) % sneaker.images.length)
                    }
                    aria-label="Foto siguiente"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full border border-white/20 bg-obsidian/85 backdrop-blur text-marble hover:bg-marble hover:text-obsidian flex items-center justify-center transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* En el teléfono las flechas quedan sobre la foto y no se
                      ve cuántas hay: el contador lo dice sin ocupar sitio. */}
                  <span className="sm:hidden absolute bottom-3 right-3 rounded-full bg-obsidian/80 px-3 py-1 text-rotulo tabular-nums text-marble/80">
                    {imageIndex + 1} / {sneaker.images.length}
                  </span>
                </>
              )}

              {discount && (
                <span className="absolute top-4 left-4 rounded-full bg-lapis text-marble text-rotulo font-bold uppercase tracking-[0.16em] px-3 py-1.5">
                  −{discount}%
                </span>
              )}
            </div>

            {/* Cinco miniaturas en 320 px dejan cuadros de 55 px imposibles de
                acertar. En móvil se muestran cuatro, que es lo que hay. */}
            {sneaker.images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {sneaker.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setImageIndex(i)}
                    aria-label={`Ver foto ${i + 1}`}
                    className={cx(
                      'aspect-square overflow-hidden rounded-foto border transition-colors',
                      i === imageIndex
                        ? 'border-silver'
                        : 'border-white/8 hover:border-white/25',
                    )}
                  >
                    <SmartImage
                      src={img}
                      alt=""
                      sizes="96px"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Información ────────────────────────────────────────── */}
          <div className="space-y-8">
            <header className="space-y-4">
              <div className="flex items-center gap-3">
                <span
                  className={cx(
                    'text-rotulo font-bold uppercase tracking-[0.28em]',
                    isOriginal ? 'text-silver' : 'text-lapis-texto',
                  )}
                >
                  {isOriginal ? '100% Original · Legit check' : 'Sneakers · Uso diario'}
                </span>
                <span className="h-px flex-1 bg-white/10" />
                <button
                  onClick={share}
                  aria-label="Compartir este par"
                  className="tap p-1.5 text-terciario hover:text-marble transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-lapis-texto" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                </button>
              </div>

              <p className="text-rotulo uppercase tracking-[0.24em] text-terciario">
                {sneaker.brand}
              </p>
              <h1 className="font-display text-4xl sm:text-5xl text-marble leading-[0.92] normal-case">
                {sneaker.name}
              </h1>
              <p className="text-lectura text-terciario font-mono">
                Ref. {sneaker.sku}
              </p>
            </header>

            {/* Precio */}
            <div className="flex items-end gap-4 pb-7 border-b border-white/10">
              <span className="font-display text-4xl text-marble">
                {formatPrice(sneaker.price, settings.currency, settings.currencySymbol)}
              </span>
              {sneaker.originalPrice && sneaker.originalPrice > sneaker.price && (
                <span className="text-[14px] text-terciario line-through mb-1">
                  {formatPrice(
                    sneaker.originalPrice,
                    settings.currency,
                    settings.currencySymbol,
                  )}
                </span>
              )}
            </div>

            {/* Tallas */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-rotulo font-semibold uppercase tracking-[0.2em] text-secundario">
                  Talla EU
                </span>
                <button
                  onClick={() => setIsGuideOpen(true)}
                  className="flex items-center gap-1.5 text-rotulo uppercase tracking-[0.16em] text-secundario hover:text-marble transition-colors"
                >
                  <Ruler className="w-3.5 h-3.5" />
                  Guía de tallas
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {sneaker.sizes.map((size) => (
                  <button
                    key={String(size)}
                    onClick={() => setSelectedSize(size)}
                    disabled={isSoldOut}
                    aria-pressed={selectedSize === size}
                    className={cx(
                      'min-w-14 h-12 px-4 rounded-full text-lectura font-semibold border transition-all disabled:opacity-30 disabled:cursor-not-allowed',
                      selectedSize === size
                        ? 'bg-marble text-obsidian border-marble'
                        : 'border-white/14 text-secundario hover:border-silver/50 hover:text-marble',
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>

              {!selectedSize && !isSoldOut && (
                <p className="text-lectura text-terciario">
                  Elige tu talla y el mensaje de WhatsApp se arma solo.
                </p>
              )}
            </div>

            {/* Acción principal */}
            <div className="space-y-3">
              {isSoldOut ? (
                <a
                  href={generateDirectWhatsAppContact(
                    settings,
                    `Reposición de ${sneaker.name}`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost w-full py-5"
                >
                  <MessageCircle className="w-4 h-4" />
                  Avísame cuando vuelva
                </a>
              ) : (
                <a
                  href={generateWhatsAppLink(sneaker, selectedSize, settings)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn w-full py-5"
                >
                  <MessageCircle className="w-4 h-4" />
                  {sneaker.status === 'bajo_encargo'
                    ? 'Cotizar bajo encargo'
                    : 'Pedir por WhatsApp'}
                </a>
              )}

              {/* Enlace secundario: texto pequeño y apagado para que no le
                  compita al botón de WhatsApp, que es la acción de la página. */}
              {igUrl && (
                <a
                  href={igUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Ver ${settings.storeName} en Instagram`}
                  className="flex items-center justify-center gap-2 text-lectura text-terciario hover:text-marble/70 transition-colors"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  Míralo en Instagram
                </a>
              )}

              <div className="grid grid-cols-3 gap-px overflow-hidden rounded-tarjeta bg-white/8 border border-white/8">
                {[
                  { Icon: ShieldCheck, label: isOriginal ? 'Legit check' : 'Revisado' },
                  { Icon: Truck, label: 'Envío nacional' },
                  { Icon: Check, label: 'Asesoría 1 a 1' },
                ].map(({ Icon, label }) => (
                  <div
                    key={label}
                    className="bg-basalt py-4 px-1 flex flex-col items-center gap-2 text-center"
                  >
                    <Icon className="w-4 h-4 text-silver/60" />
                    <span className="text-rotulo uppercase tracking-[0.04em] text-secundario leading-tight">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Descripción */}
            {sneaker.description && (
              <div className="space-y-3 pt-2">
                <h2 className="font-body text-rotulo font-semibold uppercase tracking-[0.22em] text-secundario">
                  Sobre este par
                </h2>
                <p className="text-lectura leading-relaxed text-secundario">
                  {sneaker.description}
                </p>
              </div>
            )}

            {/* Ficha técnica */}
            <dl className="border-t border-white/10 divide-y divide-white/6">
              {[
                ['Estado', sneaker.details.condition],
                ['Colorway', sneaker.details.colorway],
                ['Modelo', sneaker.model],
                sneaker.details.releaseYear && [
                  'Año',
                  String(sneaker.details.releaseYear),
                ],
                sneaker.gender && [
                  'Horma',
                  sneaker.gender.charAt(0).toUpperCase() + sneaker.gender.slice(1),
                ],
              ]
                .filter(Boolean)
                .map((row) => {
                  const [term, value] = row as [string, string];
                  if (!value) return null;
                  return (
                    <div key={term} className="flex justify-between gap-6 py-3.5">
                      <dt className="text-rotulo uppercase tracking-[0.16em] text-terciario shrink-0">
                        {term}
                      </dt>
                      <dd className="text-lectura text-marble/70 text-right">{value}</dd>
                    </div>
                  );
                })}
            </dl>

            {/* Qué incluye */}
            {sneaker.details.includedItems.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-body text-rotulo font-semibold uppercase tracking-[0.22em] text-secundario">
                  Incluye
                </h2>
                <ul className="space-y-2">
                  {sneaker.details.includedItems.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-lectura text-secundario"
                    >
                      <Check className="w-3.5 h-3.5 text-silver/60 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {sneaker.details.authenticityNotes && (
              <p className="text-lectura leading-relaxed text-secundario border-l-2 border-silver/40 pl-4 py-1">
                {sneaker.details.authenticityNotes}
              </p>
            )}
          </div>
        </div>

        {/* Relacionados */}
        {related.length > 0 && (
          <section className="mt-16 sm:mt-24">
            <SectionHeader
              eyebrow="También en esta línea"
              title="Pares parecidos"
              className="mb-7 sm:mb-9"
            />
            <Colonnade sneakers={related} lineaUnica />
          </section>
        )}

        <Link
          to={isOriginal ? '/originales' : '/sneakers'}
          className="inline-flex items-center gap-2.5 mt-14 text-rotulo font-semibold uppercase tracking-[0.22em] text-secundario hover:text-marble transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver a {isOriginal ? 'Originales' : 'Sneakers'}
        </Link>
      </article>

      {/* ── Barra de acción de móvil ──────────────────────────────────────
          La ficha es larga y el botón de WhatsApp queda arriba: después de
          leer la descripción hay que devolverse a buscarlo. Esta barra lo
          mantiene a mano con el precio al lado, y ocupa el lugar del botón
          flotante, que en esta vista se retira para no repetir la acción. */}
      <div className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-silver/20 bg-obsidian/95 backdrop-blur-lg">
        <div className="flex items-center gap-3 px-4 pt-3 pb-safe">
          <div className="min-w-0 leading-none">
            <p className="font-display text-xl text-marble">
              {formatPrice(sneaker.price, settings.currency, settings.currencySymbol)}
            </p>
            <p className="mt-1 text-rotulo uppercase tracking-[0.16em] text-terciario truncate">
              {selectedSize ? `Talla ${selectedSize}` : 'Elige tu talla'}
            </p>
          </div>

          <a
            href={
              isSoldOut
                ? generateDirectWhatsAppContact(
                    settings,
                    `Reposición de ${sneaker.name}`,
                  )
                : generateWhatsAppLink(sneaker, selectedSize, settings)
            }
            target="_blank"
            rel="noopener noreferrer"
            className={cx('btn flex-1 gap-2 py-4 tracking-[0.18em]', isSoldOut && 'btn-ghost')}
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            {isSoldOut ? 'Avísame' : 'Pedir'}
          </a>
        </div>
      </div>

      <SizeGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </>
  );
}
