import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { cx, formatPhoneDisplay, generateDirectWhatsAppContact } from '../../lib/utils';

const QUICK_TOPICS = [
  'Quiero saber mi talla',
  'Busco un par que no está en el catálogo',
  'Cómo funciona el pedido bajo encargo',
  'Costos y tiempos de envío',
];

export function FloatingWhatsApp() {
  const { settings } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();

  // El panel de administración no necesita el botón de ventas.
  if (pathname.startsWith('/admin')) return null;

  // En la ficha de producto el botón de WhatsApp ya ocupa el ancho de la
  // pantalla y es la acción de la página. En un teléfono este flotante sería
  // un segundo botón verde tapando la foto para hacer lo mismo, así que ahí
  // se retira y vuelve desde sm, donde no estorba.
  const isProductPage = pathname.startsWith('/producto/');

  return (
    <div
      className={cx(
        'fixed right-4 sm:right-5 z-40 flex-col items-end gap-3',
        'bottom-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-5',
        isProductPage ? 'hidden sm:flex' : 'flex',
      )}
    >
      {/* En el ancho: los guiones bajos son los espacios de la resta.
          `calc(100vw-2rem)` sin ellos es CSS inválido y el panel se sale de
          la pantalla en un teléfono angosto. */}
      {isOpen && (
        <div className="w-[min(19rem,calc(100vw_-_2rem))] bg-basalt border border-silver/20 shadow-2xl animate-rise">
          <div className="px-4 py-3.5 border-b border-white/8 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-marble">
                Asesor {settings.storeName}
              </p>
              <p className="text-[10px] text-marble/40 mt-0.5">
                {formatPhoneDisplay(settings.whatsappNumber)}
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar"
              className="p-1 text-marble/40 hover:text-marble"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 space-y-1.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-marble/35 px-1 pb-1.5">
              ¿Con qué te ayudamos?
            </p>
            {QUICK_TOPICS.map((topic) => (
              <a
                key={topic}
                href={generateDirectWhatsAppContact(settings, topic)}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2.5 text-[12px] text-marble/70 hover:text-marble bg-obsidian/60 hover:bg-lapis/25 border border-white/6 transition-colors"
              >
                {topic}
              </a>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? 'Cerrar asesor' : 'Abrir asesor de WhatsApp'}
        aria-expanded={isOpen}
        className="w-14 h-14 bg-marble text-obsidian flex items-center justify-center shadow-2xl hover:bg-silver transition-colors"
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
}
