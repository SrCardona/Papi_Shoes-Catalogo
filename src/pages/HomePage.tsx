import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle } from 'lucide-react';
import type { Sneaker } from '../types';
import { useStore } from '../context/StoreContext';
import { BRAND_PILLARS, BRAND_WALL } from '../data/initialData';
import { BrandLockup, TempleMark } from '../components/ui/TempleMark';
import { Colonnade } from '../components/ui/SneakerColumn';
import { SectionHeader } from '../components/ui/SectionHeader';
import { HighlightRail } from '../components/ui/HighlightRail';
import { DeliveryWall } from '../components/ui/DeliveryWall';
import { AnnouncementPopup } from '../components/ui/AnnouncementPopup';
import { generateDirectWhatsAppContact } from '../lib/utils';

/** Los pares que caben en la columnata del altar sin abrir una segunda fila. */
const ALTAR_SIZE = 8;

export function HomePage() {
  const { sneakers, settings, deliveries } = useStore();

  /* El altar muestra lo último que entró al catálogo, venga del script o del
     panel. Se ordena por fecha de alta en vez de confiar solo en `isFeatured`:
     así un par agregado a mano hoy entra sin tener que marcarlo.

     Con tope de tres por marca, porque un lote entero llega con la misma
     fecha y sin el tope el altar queda con ocho pares de la misma casa. Si
     aun así faltan puestos, se completan con los siguientes más recientes. */
  const featured = useMemo(() => {
    const recientes = [...sneakers]
      .filter((s) => s.status !== 'agotado')
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    const altar: Sneaker[] = [];
    const porMarca = new Map<string, number>();

    for (const sneaker of recientes) {
      if (altar.length === ALTAR_SIZE) break;
      const usados = porMarca.get(sneaker.brand) ?? 0;
      if (usados >= 3) continue;
      porMarca.set(sneaker.brand, usados + 1);
      altar.push(sneaker);
    }

    for (const sneaker of recientes) {
      if (altar.length === ALTAR_SIZE) break;
      if (!altar.includes(sneaker)) altar.push(sneaker);
    }

    return altar;
  }, [sneakers]);

  /* Muro de marcas: se arma con las marcas que de verdad hay en el catálogo,
     para que cada una lleve a su sección y no a un filtro vacío. */
  const brands = useMemo(
    () => [...new Set(sneakers.map((s) => s.brand))].sort(),
    [sneakers],
  );

  const counts = useMemo(
    () => ({
      originales: sneakers.filter((s) => s.category === 'originales').length,
      street: sneakers.filter((s) => s.category === 'general').length,
    }),
    [sneakers],
  );

  return (
    <>
      {/* Solo aquí: el anuncio recibe a quien llega, no persigue a quien ya
          está mirando el catálogo. */}
      <AnnouncementPopup />

      {/* ═══ FRONTÓN: la fachada del templo ═══════════════════════════════ */}
      <section className="relative sanctum-glow overflow-hidden">
        {/* Columnata de fondo: cinco fustes de luz tenue */}
        <div
          aria-hidden
          className="absolute inset-0 flex justify-center gap-16 opacity-[0.055] pointer-events-none"
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-20 h-full bg-gradient-to-b from-silver via-silver/40 to-transparent"
            />
          ))}
        </div>

        <div className="relative max-w-[1400px] mx-auto px-5 lg:px-8 pt-11 pb-14 sm:pt-16 sm:pb-20">
          <div className="flex flex-col items-center text-center">
            <BrandLockup size="xl" className="animate-rise" />

            <p
              className="mt-6 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.42em] text-silver/70 animate-rise"
              style={{ animationDelay: '120ms' }}
            >
              {settings.slogan}
            </p>

            <h1
              className="mt-7 font-display text-5xl sm:text-6xl lg:text-7xl leading-[0.86] max-w-4xl animate-rise"
              style={{ animationDelay: '200ms' }}
            >
              <span className="text-marble">Más que tenis,</span>
              <br />
              <span className="text-engraved">es cultura.</span>
            </h1>

            <p
              className="mt-6 max-w-lg text-[14px] leading-relaxed text-marble/50 animate-rise"
              style={{ animationDelay: '280ms' }}
            >
              Sneakers que hablan por ti. Originales con legit check documentado
              y una selección de sneakers cuidada par por par.
            </p>

            {/* En móvil los dos accesos ocupan el ancho y quedan uno sobre
                otro: dos botones a media pantalla se leen como un formulario,
                no como la puerta de entrada al catálogo. */}
            <div
              className="mt-9 w-full max-w-sm sm:max-w-none flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2.5 sm:gap-3 animate-rise"
              style={{ animationDelay: '360ms' }}
            >
              <Link
                to="/originales"
                className="group flex items-center justify-center gap-3 px-8 py-4 bg-marble text-obsidian text-[11px] font-bold uppercase tracking-[0.22em] hover:bg-silver transition-colors"
              >
                Ver Originales
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/sneakers"
                className="flex items-center justify-center px-8 py-4 border border-white/18 text-marble/75 text-[11px] font-bold uppercase tracking-[0.22em] hover:text-marble hover:border-silver/45 transition-colors"
              >
                Ver Sneakers
              </Link>
            </div>
          </div>
        </div>

        {/* Estilóbato de la fachada */}
        <div className="h-px stylobate" />
      </section>

      {/* ═══ HISTORIAS DESTACADAS ═════════════════════════════════════════ */}
      <HighlightRail />

      {/* ═══ LAS DOS LÍNEAS ═══════════════════════════════════════════════ */}
      <section className="max-w-[1400px] mx-auto px-5 lg:px-8 py-14 sm:py-20">
        <SectionHeader
          eyebrow="Dos líneas"
          title="Escoge tu entrada"
          description="El catálogo está dividido en dos líneas con criterios distintos. Sabe cuál estás mirando antes de decidir."
          align="center"
          className="mb-10 sm:mb-14"
        />

        <div className="grid md:grid-cols-2 gap-px bg-white/8 border border-white/8">
          {[
            {
              to: '/originales',
              room: 'Con legit check',
              title: 'Originales',
              count: counts.originales,
              text: 'Pares verificados uno por uno: costuras, códigos UV, etiqueta interior y peso. Llegan con comprobante de procedencia.',
              accent: 'text-silver',
            },
            {
              to: '/sneakers',
              room: 'Uso diario',
              title: 'Sneakers',
              count: counts.street,
              text: 'Las siluetas que se están usando ahora, con acabados premium y precio de uso diario. Para vestir, no para vitrina.',
              accent: 'text-lapis-lit',
            },
          ].map((room) => (
            <Link
              key={room.to}
              to={room.to}
              className="group relative bg-basalt hover:bg-marble-navy transition-colors duration-500 p-7 sm:p-12"
            >
              <div className="flex items-start justify-between mb-6 sm:mb-8">
                <span
                  className={`text-[9px] font-bold uppercase tracking-[0.3em] ${room.accent}`}
                >
                  {room.room}
                </span>
                <TempleMark
                  variant="line"
                  className="w-7 h-7 text-marble/20 group-hover:text-silver/60 transition-colors duration-500"
                />
              </div>

              <h3 className="font-display text-[2.75rem] sm:text-6xl text-marble mb-3 sm:mb-4">
                {room.title}
              </h3>
              <p className="text-[13px] leading-relaxed text-marble/45 max-w-sm mb-7 sm:mb-9">
                {room.text}
              </p>

              <div className="flex items-center justify-between pt-5 border-t border-white/8">
                <span className="text-[10px] uppercase tracking-[0.2em] text-marble/35 tabular-nums">
                  {room.count} pares
                </span>
                <ArrowRight className="w-4 h-4 text-marble/40 transition-transform duration-500 group-hover:translate-x-2 group-hover:text-marble" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ COLUMNATA DE DESTACADOS ══════════════════════════════════════ */}
      {featured.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-5 lg:px-8 pb-14 sm:pb-20">
          <SectionHeader
            eyebrow="Selección"
            title="En el altar"
            description="Lo último que entró al templo, de lo más reciente a lo más antiguo."
            align="center"
            className="mb-10"
            action={
              <Link
                to="/catalogo"
                className="group flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-marble/55 hover:text-marble transition-colors"
              >
                Ver los {sneakers.length} pares
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            }
          />
          <Colonnade sneakers={featured} />
        </section>
      )}

      {/* ═══ ENTREGAS RECIENTES ═══════════════════════════════════════════ */}
      {deliveries.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-5 lg:px-8 pb-14 sm:pb-20">
          <SectionHeader
            eyebrow="Comunidad"
            title="Ya están en la calle"
            description="Entregas reales con el barrio y la ciudad donde llegó cada par."
            className="mb-10"
            action={
              <Link
                to="/nosotros#entregas"
                className="group flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-marble/55 hover:text-marble transition-colors"
              >
                Ver las {deliveries.length} entregas
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            }
          />
          <DeliveryWall deliveries={deliveries} showFilters={false} limit={10} />
        </section>
      )}

      {/* ═══ MURO DE MARCAS ═══════════════════════════════════════════════ */}
      <section className="border-y border-white/8 bg-marble-navy/50 overflow-hidden py-10">
        <p className="eyebrow text-center mb-8">Trabajamos con</p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-5 px-5">
          {brands.length > 0
            ? brands.map((brand) => (
                <Link
                  key={brand}
                  to={`/catalogo?marca=${encodeURIComponent(brand)}`}
                  className="font-display text-xl sm:text-2xl text-marble/35 hover:text-silver transition-colors duration-300"
                >
                  {brand.toUpperCase()}
                </Link>
              ))
            : BRAND_WALL.map((brand) => (
                <span
                  key={brand}
                  className="font-display text-xl sm:text-2xl text-marble/22"
                >
                  {brand}
                </span>
              ))}
        </div>
      </section>

      {/* ═══ LOS CINCO PILARES ════════════════════════════════════════════ */}
      <section className="max-w-[1400px] mx-auto px-5 lg:px-8 py-14 sm:py-20">
        <SectionHeader
          eyebrow="Cómo trabajamos"
          title="Los cinco pilares"
          align="center"
          className="mb-10 sm:mb-14"
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-px bg-white/8 border border-white/8">
          {BRAND_PILLARS.map((pillar, i) => (
            <div key={pillar.id} className="bg-basalt p-6 sm:p-7 space-y-3 sm:space-y-4">
              <span className="block font-display text-3xl text-silver/25 tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="font-body font-bold text-[12px] uppercase tracking-[0.18em] text-marble">
                {pillar.title}
              </h3>
              <p className="text-[12px] leading-relaxed text-marble/45">
                {pillar.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ LLAMADO FINAL ════════════════════════════════════════════════ */}
      <section className="max-w-[1400px] mx-auto px-5 lg:px-8 pb-4">
        <div className="architrave bg-marble-navy px-6 sm:px-8 py-14 sm:py-20 text-center">
          <TempleMark className="w-11 h-11 sm:w-12 sm:h-12 mx-auto mb-6 sm:mb-7 opacity-75" />
          <h2 className="font-display text-[2.15rem] sm:text-5xl text-marble max-w-2xl mx-auto leading-[0.95]">
            ¿No encuentras el par que buscas?
          </h2>
          <p className="mt-5 text-[13px] text-marble/50 max-w-md mx-auto leading-relaxed">
            Traemos cualquier referencia y talla bajo encargo en 8 a 14 días
            hábiles, con abono del 50%.
          </p>
          <a
            href={generateDirectWhatsAppContact(
              settings,
              'Quiero cotizar un par bajo encargo',
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 sm:mt-9 inline-flex w-full max-w-sm sm:w-auto items-center justify-center gap-3 px-8 py-4 bg-marble text-obsidian text-[11px] font-bold uppercase tracking-[0.22em] hover:bg-silver transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Cotizar por WhatsApp
          </a>
        </div>
      </section>
    </>
  );
}
