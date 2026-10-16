import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useMarcasAgrupadas, useMarcasPorLinea } from '../hooks/useMarcasPorLinea';
import { lineaDeMarca } from '../lib/marcas';
import { armarRanking, recienLlegados } from '../lib/vitrina';
import { BRAND_PILLARS, BRAND_WALL } from '../data/initialData';
import { TOP_ORIGINALES, TOP_SNEAKERS } from '../data/vitrina';
import { TempleMark } from '../components/ui/TempleMark';
import { SectionHeader } from '../components/ui/SectionHeader';
import { DeliveryWall } from '../components/ui/DeliveryWall';
import { AnnouncementPopup } from '../components/ui/AnnouncementPopup';
import { RankingLinea } from '../components/vitrina/RankingLinea';
import { Carrusel } from '../components/vitrina/Carrusel';
import { cx, generateDirectWhatsAppContact } from '../lib/utils';

/** Pares de "Recién llegados": una fila y media en escritorio, para invitar a deslizar. */
const LLEGADOS = 14;

export function HomePage() {
  const { sneakers, settings, deliveries } = useStore();
  const marcas = useMarcasPorLinea();
  const agrupadas = useMarcasAgrupadas();

  const topOriginales = useMemo(
    () => armarRanking(sneakers, TOP_ORIGINALES, 'originales'),
    [sneakers],
  );
  const topSneakers = useMemo(
    () => armarRanking(sneakers, TOP_SNEAKERS, 'general'),
    [sneakers],
  );
  const llegados = useMemo(() => recienLlegados(sneakers, LLEGADOS), [sneakers]);

  /* Muro de marcas: se arma con las marcas que de verdad hay en el catálogo,
     para que cada una lleve a su sección y no a un filtro vacío.

     Cada una entra por la línea donde tiene más surtido, nunca por `/catalogo`:
     ahí las dos se mezclan y un par de uso diario aparece junto a uno con legit
     check. Calvin Klein es el caso que lo justifica —39 pares verificados
     contra 2 de uso diario—: mandarla al catálogo mezclado sería enseñar
     primero lo que menos la representa. */
  const brands = useMemo(() => {
    const vistas = new Set<string>();
    const lista: { brand: string; to: string }[] = [];
    for (const s of sneakers) {
      if (s.brand === 'Otras' || vistas.has(s.brand)) continue;
      vistas.add(s.brand);
      const { to } = lineaDeMarca(marcas, s.brand);
      /* Solo las que tienen apartado propio en la línea a la que van a parar.
         Una marca de dos pares no sostiene un renglón en el muro, y además su
         enlace caería en una sección que ya no existe: en el menú vive dentro
         de "Otras marcas", no suelta. */
      const linea = to === '/originales' ? 'originales' : 'general';
      const tieneApartado = agrupadas[linea].principales.some(
        (m) => m.brand === s.brand,
      );
      if (!tieneApartado) continue;
      lista.push({ brand: s.brand, to: `${to}?marca=${encodeURIComponent(s.brand)}` });
    }
    return lista.sort((a, b) => a.brand.localeCompare(b.brand, 'es'));
  }, [sneakers, marcas, agrupadas]);

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

      {/* ═══ BIENVENIDA ═══════════════════════════════════════════════════
          Corta a propósito: lo que vende está justo debajo, en los rankings,
          y tiene que verse sin bajar. Las dos puertas dicen qué es cada línea
          antes de entrar, porque es lo único que el cliente no puede
          equivocar. */}
      <section className="border-b border-white/8 sanctum-glow">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-8 py-8 sm:py-10 grid gap-7 lg:grid-cols-[1fr_minmax(0,560px)] lg:items-end">
          <div className="animate-rise">
            <p className="eyebrow">{settings.tagline || 'El templo de los tenis'}</p>
            <h1 className="mt-4 font-display text-[2.6rem] sm:text-6xl leading-[0.88]">
              <span className="text-marble">Más que tenis, </span>
              <span className="text-engraved">es cultura.</span>
            </h1>
          </div>

          <div
            className="grid grid-cols-2 gap-px bg-white/8 border border-white/8 animate-rise"
            style={{ animationDelay: '120ms' }}
          >
            <PuertaDeLinea
              to="/originales"
              titulo="Originales"
              bajada="Con legit check"
              pares={counts.originales}
              claro
            />
            <PuertaDeLinea
              to="/sneakers"
              titulo="Sneakers"
              bajada="Uso diario"
              pares={counts.street}
            />
          </div>
        </div>
      </section>

      {/* ═══ RANKINGS ═════════════════════════════════════════════════════ */}
      <section className="max-w-[1400px] mx-auto px-5 lg:px-8 pt-10 sm:pt-14 grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-6">
        <RankingLinea titulo="Top Originales" linea="originales" pares={topOriginales} />
        <RankingLinea titulo="Top Sneakers" linea="general" pares={topSneakers} />
      </section>

      {/* ═══ RECIÉN LLEGADOS ══════════════════════════════════════════════ */}
      <section className="max-w-[1400px] mx-auto px-5 lg:px-8 py-14 sm:py-20">
        <Carrusel titulo="Recién llegados" pares={llegados} />
      </section>

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
            ? brands.map(({ brand, to }) => (
                <Link
                  key={brand}
                  to={to}
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

/**
 * Una de las dos entradas al catálogo. Originales va sobre mármol, como el
 * número 1 de los rankings: es la línea verificada y la que se ve primero.
 */
function PuertaDeLinea({
  to,
  titulo,
  bajada,
  pares,
  claro = false,
}: {
  to: string;
  titulo: string;
  bajada: string;
  pares: number;
  claro?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cx(
        'group flex flex-col justify-between gap-6 p-4 sm:p-5 transition-colors',
        claro
          ? 'bg-marble text-obsidian hover:bg-silver'
          : 'bg-basalt text-marble hover:bg-marble-navy',
      )}
    >
      <span
        className={cx(
          'text-[9px] font-bold uppercase tracking-[0.26em]',
          claro ? 'text-obsidian/55' : 'text-lapis-lit',
        )}
      >
        {bajada}
      </span>
      <span className="flex items-end justify-between gap-3">
        <span className="font-display text-3xl sm:text-4xl leading-none">{titulo}</span>
        <ArrowRight className="w-4 h-4 mb-1 transition-transform group-hover:translate-x-1" />
      </span>
      <span
        className={cx(
          'text-[10px] uppercase tracking-[0.2em] tabular-nums',
          claro ? 'text-obsidian/50' : 'text-marble/40',
        )}
      >
        {pares} pares
      </span>
    </Link>
  );
}
