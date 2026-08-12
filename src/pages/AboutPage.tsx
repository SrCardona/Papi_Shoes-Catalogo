import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { BRAND_PILLARS } from '../data/initialData';
import { BrandLockup, TempleMark } from '../components/ui/TempleMark';
import { SectionHeader } from '../components/ui/SectionHeader';
import { DeliveryLedger, DeliveryWall } from '../components/ui/DeliveryWall';
import { generateDirectWhatsAppContact } from '../lib/utils';

const VERIFICATION_STEPS = [
  {
    title: 'Procedencia',
    text: 'Pedimos factura o comprobante de compra al proveedor antes de recibir el par. Sin origen claro, no entra.',
  },
  {
    title: 'Inspección física',
    text: 'Costuras, alineación del swoosh o las tres rayas, calidad del cuero y simetría entre los dos pies.',
  },
  {
    title: 'Marcas ocultas',
    text: 'Códigos UV, etiqueta interior, SKU de la caja contra el SKU del par y tipografía de la plantilla.',
  },
  {
    title: 'Peso y tacto',
    text: 'Comparamos el peso contra la referencia oficial. Una diferencia grande casi siempre delata una réplica.',
  },
];

export function AboutPage() {
  const { settings, sneakers, deliveries } = useStore();

  const cityCount = new Set(deliveries.map((d) => d.city)).size;

  return (
    <>
      <section className="relative sanctum-glow border-b border-white/8">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-8 py-20 sm:py-28 text-center">
          <BrandLockup size="lg" showTagline={false} className="animate-rise" />
          <h1 className="mt-9 font-display text-5xl sm:text-7xl text-marble leading-[0.88]">
            El Templo
            <br />
            <span className="text-engraved">de los Tenis</span>
          </h1>
          <p className="mt-7 max-w-xl mx-auto text-[14px] leading-relaxed text-marble/50">
            Empezamos vendiendo pares entre amigos en {settings.locationCity.split('·')[0].trim()}.
            Hoy despachamos a todo el país, pero la regla no cambió: si un par no nos
            lo pondríamos nosotros, no te lo vendemos.
          </p>
        </div>
      </section>

      {/* Cifras */}
      <section className="border-b border-white/8">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-8">
          <dl className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/8">
            {[
              ['1.500+', 'Pares entregados'],
              [`${sneakers.length}`, 'Referencias activas'],
              [`${cityCount}`, cityCount === 1 ? 'Ciudad atendida' : 'Ciudades atendidas'],
              ['24–48 h', 'Entrega en capitales'],
            ].map(([value, label]) => (
              <div key={label} className="py-10 px-5 text-center">
                <dt className="font-display text-4xl text-marble">{value}</dt>
                <dd className="mt-2 text-[9px] uppercase tracking-[0.2em] text-marble/40">
                  {label}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Proceso de verificación */}
      <section className="max-w-[1400px] mx-auto px-5 lg:px-8 py-20">
        <SectionHeader
          eyebrow="Legit check"
          title="Cómo verificamos"
          description="Cuatro revisiones antes de que un par entre a la línea Originales. Si falla una, pasa a la línea Sneakers o se devuelve."
          className="mb-14"
        />

        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/8 border border-white/8">
          {VERIFICATION_STEPS.map((step, i) => (
            <li key={step.title} className="bg-basalt p-7 space-y-4">
              <span className="block font-display text-3xl text-silver/25 tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="font-body font-bold text-[12px] uppercase tracking-[0.18em] text-marble">
                {step.title}
              </h3>
              <p className="text-[12px] leading-relaxed text-marble/45">{step.text}</p>
            </li>
          ))}
        </ol>

        <p className="mt-8 text-[12px] text-marble/40 leading-relaxed max-w-2xl border-l-2 border-silver/40 pl-5 py-1">
          La línea Sneakers no pasa por legit check y no se vende como original.
          Son pares de buena factura para uso diario, y lo decimos de frente: preferimos
          perder una venta antes que venderte algo con una etiqueta que no le corresponde.
        </p>
      </section>

      {/* Entregas documentadas */}
      {deliveries.length > 0 && (
        <section
          id="entregas"
          className="border-t border-white/8 bg-marble-navy/25 scroll-mt-20"
        >
          <div className="max-w-[1400px] mx-auto px-5 lg:px-8 py-20 space-y-10">
            <SectionHeader
              eyebrow="Comunidad"
              title="Entregas"
              description="Cada foto es un par que ya está en la calle, con el barrio y la ciudad donde se entregó. Sin montajes ni fotos de catálogo."
            />

            <DeliveryLedger deliveries={deliveries} />

            <DeliveryWall deliveries={deliveries} />

            <p className="text-[11.5px] text-marble/35 leading-relaxed max-w-xl">
              Publicamos estas fotos con permiso de cada cliente y solo mostramos
              barrio y ciudad, nunca la dirección.
            </p>
          </div>
        </section>
      )}

      {/* Pilares */}
      <section className="border-y border-white/8 bg-marble-navy/40">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-8 py-20">
          <SectionHeader
            eyebrow="Manifiesto"
            title="En qué creemos"
            align="center"
            className="mb-14"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-px bg-white/8 border border-white/8">
            {BRAND_PILLARS.map((pillar) => (
              <div key={pillar.id} className="bg-obsidian p-7 space-y-4">
                <TempleMark variant="line" className="w-6 h-6 text-silver/40" />
                <h3 className="font-body font-bold text-[12px] uppercase tracking-[0.18em] text-marble">
                  {pillar.title}
                </h3>
                <p className="text-[12px] leading-relaxed text-marble/45">
                  {pillar.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cierre */}
      <section className="max-w-[1400px] mx-auto px-5 lg:px-8 py-20 text-center">
        <h2 className="font-display text-4xl sm:text-5xl text-marble max-w-xl mx-auto leading-[0.95]">
          Sneakers que hablan por ti
        </h2>
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/catalogo"
            className="group flex items-center gap-3 px-8 py-4 bg-marble text-obsidian text-[11px] font-bold uppercase tracking-[0.22em] hover:bg-silver transition-colors"
          >
            Ver el catálogo
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href={generateDirectWhatsAppContact(settings, 'Asesoría personalizada')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-8 py-4 border border-white/18 text-marble/75 text-[11px] font-bold uppercase tracking-[0.22em] hover:text-marble hover:border-silver/45 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Hablar con un asesor
          </a>
        </div>
      </section>
    </>
  );
}
