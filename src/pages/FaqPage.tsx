import { useMemo, useState } from 'react';
import { ChevronDown, MessageCircle, Search } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { SectionHeader } from '../components/ui/SectionHeader';
import { cx, generateDirectWhatsAppContact } from '../lib/utils';

type FaqCategory = 'autenticidad' | 'tallas' | 'pagos' | 'envios' | 'pedidos';

interface FaqItem {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
}

const CATEGORY_LABELS: Record<FaqCategory | 'all', string> = {
  all: 'Todas',
  autenticidad: 'Autenticidad',
  tallas: 'Tallas',
  pagos: 'Pagos',
  envios: 'Envíos',
  pedidos: 'Pedidos',
};

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'a1',
    category: 'autenticidad',
    question: '¿Cuál es la diferencia entre Originales y Sneakers?',
    answer:
      'La línea Originales reúne pares que pasaron legit check: revisamos procedencia, costuras, códigos UV, etiqueta interior y peso, y llegan con comprobante. La línea Sneakers son pares de buena factura para uso diario que no se venden como originales. Lo decimos claro en cada ficha para que sepas qué estás comprando.',
  },
  {
    id: 'a2',
    category: 'autenticidad',
    question: '¿Qué pasa si dudo de la autenticidad al recibir el par?',
    answer:
      'Tienes 5 días para hacerle legit check por tu cuenta con el servicio que prefieras. Si un par de la línea Originales no pasa la verificación, te devolvemos el 100% del dinero y asumimos el costo del envío de vuelta.',
  },
  {
    id: 't1',
    category: 'tallas',
    question: '¿Cómo sé qué talla pedir?',
    answer:
      'Mide tu pie por la tarde (se hincha durante el día), de talón al dedo más largo, y compara ese número en centímetros contra la guía de tallas de cada producto. Jordan y Nike suelen tallar justo; en Yeezy y New Balance conviene subir media talla.',
  },
  {
    id: 't2',
    category: 'tallas',
    question: '¿Puedo cambiar la talla si no me queda?',
    answer:
      'Sí, dentro de los 5 días siguientes a la entrega y siempre que el par esté sin usar, con caja y etiquetas. El cambio está sujeto a disponibilidad de la talla nueva y el envío del intercambio corre por cuenta del comprador.',
  },
  {
    id: 'p1',
    category: 'pagos',
    question: '¿Qué medios de pago aceptan?',
    answer:
      'Transferencia bancaria, Nequi, Daviplata y pago contra entrega en Medellín y Bogotá. Para pedidos bajo encargo pedimos un abono del 50% para iniciar la importación y el saldo al momento de la entrega.',
  },
  {
    id: 'p2',
    category: 'pagos',
    question: '¿Manejan pago contra entrega en todo el país?',
    answer:
      'Contra entrega solo en Medellín y Bogotá. Para el resto del país trabajamos con transferencia previa; te enviamos la guía de rastreo apenas se despacha el paquete.',
  },
  {
    id: 'e1',
    category: 'envios',
    question: '¿Cuánto tarda el envío?',
    answer:
      'Entre 24 y 48 horas hábiles a ciudades principales y de 3 a 5 días a municipios. Despachamos de lunes a sábado y compartimos la guía de Servientrega, Interrapidísimo o Coordinadora para que rastrees el pedido.',
  },
  {
    id: 'e2',
    category: 'envios',
    question: '¿El envío tiene costo?',
    answer:
      'El envío estándar tiene un costo fijo que te confirmamos por WhatsApp según la ciudad. Si llevas dos pares o más en el mismo pedido, el envío corre por nuestra cuenta.',
  },
  {
    id: 'x1',
    category: 'pedidos',
    question: '¿Cómo funciona el pedido bajo encargo?',
    answer:
      'Nos escribes la referencia y la talla que buscas, cotizamos con nuestros proveedores y te damos precio cerrado. Con el 50% de abono iniciamos el proceso; el par llega en 8 a 14 días hábiles y pagas el saldo al recibirlo.',
  },
  {
    id: 'x2',
    category: 'pedidos',
    question: '¿Puedo reservar un par que está agotado?',
    answer:
      'Sí. Escríbenos y te anotamos en la lista de la referencia; te avisamos apenas entre stock, antes de publicarlo en el catálogo.',
  },
];

export function FaqPage() {
  const { settings } = useStore();
  const [category, setCategory] = useState<FaqCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0].id);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQ_ITEMS.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (!q) return true;
      return `${item.question} ${item.answer}`.toLowerCase().includes(q);
    });
  }, [category, query]);

  return (
    <>
      <section className="max-w-3xl mx-auto px-5 lg:px-8 pt-16 pb-10">
        <SectionHeader
          eyebrow="Soporte"
          title="Preguntas frecuentes"
          description="Lo que más nos preguntan por WhatsApp, resuelto de una vez."
          align="center"
        />
      </section>

      <section className="max-w-3xl mx-auto px-5 lg:px-8 pb-24">
        {/* Buscador */}
        <div className="relative mb-5">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-marble/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar una pregunta"
            aria-label="Buscar en las preguntas frecuentes"
            className="w-full bg-basalt border border-white/12 py-3.5 pl-11 pr-4 text-[13px] text-marble placeholder:text-marble/30 focus:outline-none focus:border-silver/45 transition-colors"
          />
        </div>

        {/* Categorías */}
        <div className="flex flex-wrap gap-px border border-white/10 mb-8">
          {(Object.keys(CATEGORY_LABELS) as (FaqCategory | 'all')[]).map((key) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={cx(
                'flex-1 min-w-[80px] py-3 text-[9px] font-semibold uppercase tracking-[0.16em] transition-colors',
                category === key
                  ? 'bg-marble text-obsidian'
                  : 'text-marble/45 hover:text-marble',
              )}
            >
              {CATEGORY_LABELS[key]}
            </button>
          ))}
        </div>

        {/* Acordeón */}
        {results.length > 0 ? (
          <ul className="border-t border-white/10">
            {results.map((item) => {
              const isOpen = openId === item.id;
              return (
                <li key={item.id} className="border-b border-white/10">
                  <h3>
                    <button
                      onClick={() => setOpenId(isOpen ? null : item.id)}
                      aria-expanded={isOpen}
                      className="w-full flex items-start justify-between gap-5 py-5 text-left group"
                    >
                      <span
                        className={cx(
                          'font-body font-semibold text-[13.5px] leading-snug normal-case tracking-normal transition-colors',
                          isOpen ? 'text-marble' : 'text-marble/70 group-hover:text-marble',
                        )}
                      >
                        {item.question}
                      </span>
                      <ChevronDown
                        className={cx(
                          'w-4 h-4 shrink-0 mt-0.5 text-marble/35 transition-transform duration-300',
                          isOpen && 'rotate-180 text-silver',
                        )}
                      />
                    </button>
                  </h3>
                  {isOpen && (
                    <p className="pb-6 pr-9 text-[13px] leading-relaxed text-marble/50 animate-fade">
                      {item.answer}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="py-16 text-center space-y-4">
            <p className="text-[13px] text-marble/45">
              No encontramos esa pregunta. Escríbenos y te respondemos directo.
            </p>
          </div>
        )}

        {/* Cierre */}
        <div className="mt-14 architrave bg-marble-navy p-9 text-center">
          <h2 className="font-display text-3xl text-marble">
            ¿Tu pregunta no está aquí?
          </h2>
          <p className="mt-3 text-[13px] text-marble/50 max-w-sm mx-auto leading-relaxed">
            Respondemos en menos de 5 minutos en horario laboral.
          </p>
          <a
            href={generateDirectWhatsAppContact(settings, 'Tengo una pregunta')}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex items-center gap-3 px-7 py-4 bg-marble text-obsidian text-[11px] font-bold uppercase tracking-[0.22em] hover:bg-silver transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Preguntar por WhatsApp
          </a>
        </div>
      </section>
    </>
  );
}
