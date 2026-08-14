import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Instagram, Menu, MessageCircle, Search, Shield, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { TempleMark } from '../ui/TempleMark';
import { cx, generateDirectWhatsAppContact, instagramUrl } from '../../lib/utils';

const NAV_LINKS = [
  { to: '/originales', label: 'Originales' },
  { to: '/sneakers', label: 'Sneakers' },
  { to: '/catalogo', label: 'Catálogo' },
  { to: '/nosotros', label: 'El Templo' },
  { to: '/preguntas', label: 'Preguntas' },
];

export function Navbar() {
  const { settings, sneakers } = useStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuOpenedAt, setMenuOpenedAt] = useState(location.pathname);
  const [isScrolled, setIsScrolled] = useState(false);
  const [query, setQuery] = useState('');

  const igUrl = instagramUrl(settings.instagramHandle);

  // El menú móvil se cierra al cambiar de ruta. Ajustar el estado durante el
  // render (en vez de en un efecto) evita el parpadeo de un render intermedio
  // con el menú todavía abierto sobre la vista nueva.
  if (isMenuOpen && menuOpenedAt !== location.pathname) {
    setIsMenuOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  const openMenu = () => {
    setMenuOpenedAt(location.pathname);
    setIsMenuOpen(true);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/catalogo?q=${encodeURIComponent(query.trim())}`);
    setQuery('');
  };

  return (
    <>
      {settings.showAnnouncement && (
        <div className="bg-lapis text-marble overflow-hidden">
          <p className="py-2 text-center text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.28em] px-4 truncate">
            {settings.announcement}
          </p>
        </div>
      )}

      <header
        className={cx(
          'sticky top-0 z-40 transition-all duration-500',
          isScrolled
            ? 'bg-obsidian/94 backdrop-blur-xl border-b border-silver/12'
            : 'bg-transparent border-b border-transparent',
        )}
      >
        <div className="max-w-[1400px] mx-auto px-5 lg:px-8">
          <div className="flex items-center justify-between h-[68px] gap-6">
            {/* Emblema */}
            <Link
              to="/"
              className="flex items-center gap-3 shrink-0 group"
              aria-label={`${settings.storeName} — inicio`}
            >
              <TempleMark className="w-8 h-8 transition-transform duration-500 group-hover:-translate-y-0.5" />
              {/* El nombre también en móvil: es la identidad de la tienda y
                  antes desaparecía justo donde más gente entra. La bajada sí
                  espera a sm, que es donde hay ancho para leerla. */}
              <span className="flex flex-col leading-none min-w-0">
                <span className="font-display text-engraved text-base sm:text-lg truncate">
                  {settings.storeName}
                </span>
                {settings.tagline && (
                  <span className="hidden sm:block text-[6.5px] font-semibold uppercase tracking-[0.34em] text-silver/55 mt-1">
                    {settings.tagline}
                  </span>
                )}
              </span>
            </Link>

            {/* Navegación de escritorio */}
            <nav className="hidden lg:flex items-center gap-8">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    cx(
                      'relative text-[10px] font-semibold uppercase tracking-[0.22em] transition-colors py-2',
                      isActive
                        ? 'text-marble'
                        : 'text-marble/45 hover:text-marble/85',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {link.label}
                      {isActive && (
                        <span className="absolute -bottom-0.5 inset-x-0 h-px bg-silver/70" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Acciones */}
            <div className="flex items-center gap-2">
              <form onSubmit={submitSearch} className="hidden xl:block relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-marble/35" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Buscar entre ${sneakers.length} pares`}
                  aria-label="Buscar en el catálogo"
                  className="w-52 bg-basalt/70 border border-white/10 py-2 pl-9 pr-3 text-[11px] text-marble placeholder:text-marble/30 focus:outline-none focus:border-silver/40 transition-colors"
                />
              </form>

              <a
                href={generateDirectWhatsAppContact(settings, 'Asesoría de tallas y disponibilidad')}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-marble text-obsidian text-[10px] font-bold uppercase tracking-[0.18em] hover:bg-silver transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Asesoría
              </a>

              {/* Solo en pantallas medianas hacia arriba: en móvil vive en el
                  menú desplegable para no apretar la barra. */}
              {igUrl && (
                <a
                  href={igUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${settings.storeName} en Instagram`}
                  className="hidden sm:inline-flex p-2.5 text-marble/40 hover:text-silver transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}

              {/* El acceso al panel es para la tienda, no para el cliente: en
                  móvil vive solo dentro del menú, donde ya estaba, y así la
                  barra queda con una sola acción. */}
              <Link
                to="/admin"
                aria-label="Panel de administración"
                className="hidden sm:block p-2.5 text-marble/40 hover:text-silver transition-colors"
              >
                <Shield className="w-4 h-4" />
              </Link>

              <button
                onClick={openMenu}
                aria-label="Abrir menú"
                className="tap lg:hidden -mr-1.5 p-2.5 text-marble"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Menú móvil a pantalla completa */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-obsidian animate-fade lg:hidden flex flex-col">
          <div className="flex items-center justify-between h-[68px] px-5 border-b border-white/8">
            <TempleMark className="w-8 h-8" />
            <button
              onClick={() => setIsMenuOpen(false)}
              aria-label="Cerrar menú"
              className="tap -mr-1.5 p-2.5 text-marble"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* `overflow-y-auto` para que en un teléfono bajito los cinco enlaces
              y el pie del menú no se corten sin poder alcanzarlos. */}
          <nav className="flex-1 flex flex-col justify-center px-7 sm:px-8 gap-1 overflow-y-auto">
            {NAV_LINKS.map((link, i) => (
              <NavLink
                key={link.to}
                to={link.to}
                style={{ animationDelay: `${i * 55}ms` }}
                className={({ isActive }) =>
                  cx(
                    'font-display text-3xl py-3.5 border-b border-white/6 animate-rise transition-colors',
                    isActive ? 'text-marble' : 'text-marble/45',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="px-7 sm:px-8 pt-6 pb-safe space-y-3">
            <a
              href={generateDirectWhatsAppContact(settings)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 bg-marble text-obsidian text-[11px] font-bold uppercase tracking-[0.22em]"
            >
              <MessageCircle className="w-4 h-4" />
              Hablar con un asesor
            </a>
            <Link
              to="/admin"
              className="flex items-center justify-center gap-2 w-full py-3.5 border border-white/12 text-marble/55 text-[10px] font-semibold uppercase tracking-[0.22em]"
            >
              <Shield className="w-3.5 h-3.5" />
              Panel de administración
            </Link>
            {igUrl && (
              <a
                href={igUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${settings.storeName} en Instagram`}
                className="flex items-center justify-center gap-2 w-full py-3 text-marble/40 hover:text-marble text-[10px] font-semibold uppercase tracking-[0.22em] transition-colors"
              >
                <Instagram className="w-3.5 h-3.5" />
                Instagram
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}
