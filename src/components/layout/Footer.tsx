import { Link } from 'react-router-dom';
import { Instagram, MessageCircle, Music2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { BRAND_PILLARS } from '../../data/initialData';
import { TempleMark } from '../ui/TempleMark';
import { formatPhoneDisplay, generateDirectWhatsAppContact } from '../../lib/utils';

export function Footer() {
  const { settings } = useStore();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-marble-navy border-t border-silver/15 mt-24">
      {/* Friso de valores — los cinco pilares del manual */}
      <div className="border-b border-white/8">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-8">
          <ul className="grid grid-cols-2 md:grid-cols-5 divide-x divide-white/8">
            {BRAND_PILLARS.map((pillar) => (
              <li key={pillar.id} className="py-6 px-4 text-center">
                <span className="eyebrow block text-silver/80">{pillar.title}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-5 lg:px-8 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Marca */}
          <div className="lg:col-span-5 space-y-5">
            <div className="flex items-center gap-4">
              <TempleMark className="w-12 h-12" />
              <div className="leading-none">
                <p className="font-display text-engraved text-2xl">PAPI SHOES</p>
                <p className="text-[8px] font-semibold uppercase tracking-[0.34em] text-silver/55 mt-1.5">
                  El Templo de los Tenis
                </p>
              </div>
            </div>
            <p className="text-[13px] text-marble/45 leading-relaxed max-w-sm">
              {settings.guaranteeText} Atendemos desde {settings.locationCity}.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href={`https://instagram.com/${settings.instagramHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 border border-white/12 flex items-center justify-center text-marble/50 hover:text-marble hover:border-silver/40 transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href={`https://tiktok.com/@${settings.tiktokHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="w-10 h-10 border border-white/12 flex items-center justify-center text-marble/50 hover:text-marble hover:border-silver/40 transition-colors"
              >
                <Music2 className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Navegación */}
          <nav className="lg:col-span-3">
            <p className="eyebrow mb-5">Catálogo</p>
            <ul className="space-y-3 text-[13px]">
              {[
                { to: '/originales', label: 'Originales' },
                { to: '/sneakers', label: 'Sneakers' },
                { to: '/catalogo', label: 'Catálogo completo' },
                { to: '/nosotros', label: 'El Templo' },
                { to: '/nosotros#entregas', label: 'Entregas a clientes' },
                { to: '/preguntas', label: 'Preguntas frecuentes' },
              ].map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-marble/45 hover:text-marble transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contacto — la "firma de WhatsApp" del manual */}
          <div className="lg:col-span-4">
            <p className="eyebrow mb-5">Escríbenos</p>
            <ul className="space-y-2.5 text-[13px] text-marble/45 mb-6">
              <li>Asesoría personalizada</li>
              <li>Referencias y lanzamientos</li>
              <li>Originales bajo encargo</li>
              <li>Envíos a todo el país</li>
            </ul>
            <a
              href={generateDirectWhatsAppContact(settings)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-5 py-3.5 bg-marble text-obsidian text-[11px] font-bold tracking-[0.12em] hover:bg-silver transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              {formatPhoneDisplay(settings.whatsappNumber)}
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/8">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[10px] text-marble/30 uppercase tracking-[0.2em]">
            © {year} {settings.storeName} · {settings.slogan}
          </p>
          <p className="text-[10px] text-marble/25 uppercase tracking-[0.2em]">
            Más que tenis, es cultura
          </p>
        </div>
      </div>
    </footer>
  );
}
