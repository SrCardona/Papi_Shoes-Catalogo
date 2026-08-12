import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, MessageCircle, Search, Shield, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { TempleMark } from '../ui/TempleMark';
import { cx, generateDirectWhatsAppContact } from '../../lib/utils';

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
              aria-label="PAPI SHOES — inicio"
            >
              <TempleMark className="w-8 h-8 transition-transform duration-500 group-hover:-translate-y-0.5" />
              <span className="hidden sm:flex flex-col leading-none">
                <span className="font-display text-engraved text-lg">PAPI SHOES</span>
                <span className="text-[6.5px] font-semibold uppercase tracking-[0.34em] text-silver/55 mt-1">
                  El Templo de los Tenis
                </span>
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

              <Link
                to="/admin"
                aria-label="Panel de administración"
                className="p-2.5 text-marble/40 hover:text-silver transition-colors"
              >
                <Shield className="w-4 h-4" />
              </Link>

              <button
                onClick={openMenu}
                aria-label="Abrir menú"
                className="lg:hidden p-2.5 text-marble"
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
              className="p-2.5 text-marble"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 flex flex-col justify-center px-8 gap-1">
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

          <div className="p-8 space-y-3">
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
          </div>
        </div>
      )}
    </>
  );
}
