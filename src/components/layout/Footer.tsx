import { Link } from 'react-router-dom';
import { Instagram, MessageCircle, Music2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { BRAND_PILLARS } from '../../data/initialData';
import { TempleMark } from '../ui/TempleMark';
import {
  formatPhoneDisplay,
  generateDirectWhatsAppContact,
  instagramUrl,
} from '../../lib/utils';

export function Footer() {
  const { settings } = useStore();
  const year = new Date().getFullYear();
  const igUrl = instagramUrl(settings.instagramHandle);

  return (
    <footer className="bg-marble-navy border-t border-silver/15 mt-24">
      {/* Friso de valores — los cinco pilares del manual */}
      <div className="border-b border-white/8">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-8">
          <ul className="flex flex-wrap justify-center gap-x-10 gap-y-3 py-6">
            {BRAND_PILLARS.map((pillar) => (
              <li key={pillar.id} className="text-center">
                {/* Las mismas letras que `eyebrow`, con menos tracking: en una celda
                    angosta "Global Sneaker Culture" se partía en tres líneas,
                    y `.eyebrow` le gana a cualquier clase de tracking. */}
                <span className="block text-rotulo font-semibold uppercase tracking-[0.16em] sm:tracking-[0.24em] text-silver">
                  {pillar.title}
                </span>
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
              <TempleMark className="w-[52px] h-[52px]" title={settings.storeName} />
              <div className="leading-none">
                <p className="font-display text-engraved text-[32px]">
                  {settings.storeName}
                </p>
                {settings.tagline && (
                  <p className="text-rotulo font-semibold uppercase tracking-[0.34em] text-secundario mt-1.5">
                    {settings.tagline}
                  </p>
                )}
              </div>
            </div>
            <p className="text-lectura text-secundario leading-relaxed max-w-sm">
              {settings.guaranteeText} Atendemos desde {settings.locationCity}.
            </p>
            <div className="flex items-center gap-3 pt-1">
              {igUrl && (
                <a
                  href={igUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${settings.storeName} en Instagram`}
                  className="w-11 h-11 rounded-full border border-white/16 flex items-center justify-center text-secundario hover:text-marble hover:border-silver/40 transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              <a
                href={`https://tiktok.com/@${settings.tiktokHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="w-11 h-11 rounded-full border border-white/16 flex items-center justify-center text-secundario hover:text-marble hover:border-silver/40 transition-colors"
              >
                <Music2 className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Navegación */}
          <nav className="lg:col-span-3">
            <p className="eyebrow mb-5">Catálogo</p>
            <ul className="space-y-3 text-lectura">
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
                    className="text-secundario hover:text-marble transition-colors"
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
            <ul className="space-y-2.5 text-lectura text-secundario mb-6">
              <li>Asesoría personalizada</li>
              <li>Referencias y lanzamientos</li>
              <li>Originales bajo encargo</li>
              <li>Envíos a todo el país</li>
            </ul>
            <a
              href={generateDirectWhatsAppContact(settings)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn gap-2.5 text-lectura tracking-[0.1em]"
            >
              <MessageCircle className="w-4 h-4" />
              {formatPhoneDisplay(settings.whatsappNumber)}
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/8">
        {/* En el celular, al final de la página el botón flotante de WhatsApp
            ya no tiene a dónde apartarse y quedaba encima de esta línea. Se le
            deja su alto (56 px), su margen y el área segura del teléfono. */}
        <div className="max-w-[1400px] mx-auto px-5 lg:px-8 pt-6 pb-[calc(1.5rem+5rem+env(safe-area-inset-bottom))] sm:pb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-rotulo text-terciario uppercase tracking-[0.2em]">
            © {year} {settings.storeName} · {settings.slogan}
          </p>
          <p className="text-rotulo text-terciario uppercase tracking-[0.2em]">
            Más que tenis, es cultura
          </p>
        </div>
      </div>
    </footer>
  );
}
