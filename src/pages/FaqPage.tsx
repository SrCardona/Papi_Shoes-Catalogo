import { useMemo, useState } from 'react';
import { ChevronDown, MessageCircle, Search } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { SectionHeader } from '../components/ui/SectionHeader';
import { cx, generateDirectWhatsAppContact } from '../lib/utils';
import PREGUNTAS from '../data/preguntas.json';

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

/* El texto vive en un JSON porque `scripts/generar-fichas.mjs` también lo
   escribe en el HTML estático de /preguntas, para los robots que no ejecutan
   JavaScript. Una sola fuente: lo que se edita aquí sale en los dos lados. */
const FAQ_ITEMS = PREGUNTAS as FaqItem[];

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
          nivel="h1"
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
            className="campo w-full py-3.5 pl-11 pr-4"
          />
        </div>

        {/* Categorías */}
        <div className="flex flex-wrap gap-2 mb-8">
          {(Object.keys(CATEGORY_LABELS) as (FaqCategory | 'all')[]).map((key) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              aria-pressed={category === key}
              className={cx('chip', category === key && 'chip-on')}
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
                          'font-body font-semibold text-lectura leading-snug normal-case tracking-normal transition-colors',
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
                  {/* Cerrada se oculta, no se desmonta: así la respuesta está
                      en la página para buscadores y lectores aunque nadie la
                      haya abierto. */}
                  <p
                    hidden={!isOpen}
                    className="pb-6 pr-9 text-lectura leading-relaxed text-secundario animate-fade"
                  >
                    {item.answer}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="py-16 text-center space-y-4">
            <p className="text-lectura text-secundario">
              No encontramos esa pregunta. Escríbenos y te respondemos directo.
            </p>
          </div>
        )}

        {/* Cierre */}
        <div className="mt-14 architrave rounded-sala bg-marble-navy p-9 text-center">
          <h2 className="font-display text-3xl text-marble">
            ¿Tu pregunta no está aquí?
          </h2>
          <p className="mt-3 text-lectura text-secundario max-w-sm mx-auto leading-relaxed">
            Respondemos en menos de 5 minutos en horario laboral.
          </p>
          <a
            href={generateDirectWhatsAppContact(settings, 'Tengo una pregunta')}
            target="_blank"
            rel="noopener noreferrer"
            className="btn mt-7"
          >
            <MessageCircle className="w-4 h-4" />
            Preguntar por WhatsApp
          </a>
        </div>
      </section>
    </>
  );
}
