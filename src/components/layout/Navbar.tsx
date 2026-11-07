import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Gift, Instagram, Menu, MessageCircle, Search, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useMarcasAgrupadas } from '../../hooks/useMarcasPorLinea';
import { useMovimientoReducido } from '../../hooks/useMovimientoReducido';
import { TempleMark } from '../ui/TempleMark';
import { Luces } from '../navidad/Luces';
import { BrandAccordion, BrandDropdown } from './BrandDropdown';
import { cx, generateDirectWhatsAppContact, instagramUrl } from '../../lib/utils';

/**
 * Las dos líneas llevan desplegable de marcas; el resto son enlaces secos.
 *
 * Catálogo se queda sin menú a propósito: es la vista que mezcla las dos
 * líneas, y colgarle marcas sería ofrecer justo el atajo que no queremos —una
 * marca sin línea, con los pares verificados revueltos con los de uso diario—.
 */
const LINEAS = [
  { to: '/originales', label: 'Originales', linea: 'originales' },
  { to: '/sneakers', label: 'Sneakers', linea: 'general' },
] as const;

const NAV_LINKS = [
  { to: '/catalogo', label: 'Catálogo' },
  { to: '/nosotros', label: 'El Templo' },
  { to: '/preguntas', label: 'Preguntas' },
];

const FELIZ_NAVIDAD = 'Feliz Navidad desde el templo';

/** Una frase de la cinta, con el punto que la separa de la siguiente. */
function TramoCinta({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-2 pl-10 whitespace-nowrap text-rotulo font-semibold uppercase tracking-[0.24em]">
      {children}
      <span aria-hidden className="pl-8 text-marble/60">
        ·
      </span>
    </span>
  );
}

export function Navbar({ navidad = false }: { navidad?: boolean }) {
  const { settings, sneakers } = useStore();
  const marcas = useMarcasAgrupadas();
  const location = useLocation();
  const navigate = useNavigate();
  const reducido = useMovimientoReducido();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuOpenedAt, setMenuOpenedAt] = useState(location.pathname);
  const [isScrolled, setIsScrolled] = useState(false);
  const [query, setQuery] = useState('');

  const igUrl = instagramUrl(settings.instagramHandle);
  const tramos = settings.announcement
    .split('·')
    .map((t) => t.trim())
    .filter(Boolean);
  const anuncioCorto = tramos[0] ?? '';

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
      {/* El anuncio corre como cinta, una sola franja de un solo renglón: así
          caben todas las frases también en el celular, sin partirse en tres
          renglones que empujaban el catálogo fuera de la primera pantalla.
          Con movimiento reducido vuelve a ser la franja quieta de antes, que
          en el celular muestra solo el primer tramo (hasta el primer "·"). */}
      {settings.showAnnouncement && anuncioCorto && (
        <div className="bg-lapis text-marble overflow-hidden">
          {reducido ? (
            <>
              <p className="sm:hidden py-2.5 px-4 text-center text-rotulo font-semibold uppercase tracking-[0.16em] truncate">
                {navidad ? FELIZ_NAVIDAD : anuncioCorto}
              </p>
              <p className="hidden sm:block py-2.5 px-4 text-center text-rotulo font-semibold uppercase tracking-[0.24em] truncate">
                {navidad ? `${FELIZ_NAVIDAD} · ${settings.announcement}` : settings.announcement}
              </p>
            </>
          ) : (
            <div className="cinta-marco py-2.5">
              {/* Lo que oye un lector de pantalla: el anuncio una vez, entero.
                  La cinta repite cada frase y se le esconde. */}
              <p className="sr-only">
                {navidad ? `${FELIZ_NAVIDAD}. ` : ''}
                {tramos.join('. ')}
              </p>
              <div aria-hidden className="cinta">
                {[0, 1].map((copia) => (
                  <div key={copia} className="flex shrink-0 items-center">
                    {/* Cada copia lleva las frases dos veces: con un anuncio
                        corto, una sola vuelta no llenaba una pantalla de
                        1920 px y la cinta mostraba un hueco antes de repetir. */}
                    {[0, 1].map((vuelta) => (
                      <Fragment key={vuelta}>
                        {navidad && (
                          <TramoCinta>
                            <Gift className="w-3.5 h-3.5 shrink-0" />
                            {FELIZ_NAVIDAD}
                          </TramoCinta>
                        )}
                        {tramos.map((tramo, i) => (
                          <TramoCinta key={i}>{tramo}</TramoCinta>
                        ))}
                      </Fragment>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <header
        className={cx(
          'sticky top-0 z-40 bg-obsidian/82 backdrop-blur-xl border-b transition-colors duration-500',
          isScrolled ? 'border-white/10' : 'border-transparent',
        )}
      >
        <div className="max-w-[1400px] mx-auto px-5 lg:px-8">
          <div className="flex items-center justify-between h-[72px] gap-6">
            {/* Emblema */}
            <Link
              to="/"
              className="flex items-center gap-3 shrink-0 group"
              aria-label={`${settings.storeName} — inicio`}
            >
              <span className="relative shrink-0 transition-transform duration-500 group-hover:-translate-y-0.5">
                <TempleMark className="w-[34px] h-[34px]" gorro={navidad} />
              </span>
              {/* El nombre también en móvil: es la identidad de la tienda y
                  antes desaparecía justo donde más gente entra. La bajada sí
                  espera a sm, que es donde hay ancho para leerla, y se retira
                  entre lg y xl: ahí entra la navegación completa y con la
                  bajada la fila pedía 1019 px en un contenedor de 960, y
                  "Asesoría" quedaba cortado contra el borde. */}
              <span className="flex flex-col leading-none min-w-0">
                <span className="font-display text-engraved text-xl sm:text-[26px] truncate">
                  {settings.storeName}
                </span>
                {settings.tagline && (
                  <span className="hidden sm:block lg:hidden xl:block whitespace-nowrap text-rotulo font-semibold uppercase tracking-[0.2em] text-secundario mt-1">
                    {settings.tagline}
                  </span>
                )}
              </span>
            </Link>

            {/* Navegación de escritorio. Separación y buscador crecen recién en
                2xl: en xl (1280) la fila con el buscador pedía 1265 px de 1216,
                y lo que parecía caber era la fila encogiendo los íconos. Con
                estos valores, medido sin dejar encoger nada, sobra en todo el
                tramo de 1024 a 1920. */}
            <nav className="hidden lg:flex items-center gap-5 2xl:gap-[34px]">
              {LINEAS.map((linea) => (
                <BrandDropdown
                  key={linea.to}
                  to={linea.to}
                  label={linea.label}
                  marcas={marcas[linea.linea].principales}
                  otras={marcas[linea.linea].otras}
                />
              ))}
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    cx(
                      'relative whitespace-nowrap text-rotulo font-semibold uppercase tracking-[0.14em] transition-colors py-2',
                      isActive
                        ? 'text-marble'
                        : 'text-secundario hover:text-marble/85',
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
            <div className="flex items-center gap-2.5">
              <form onSubmit={submitSearch} className="hidden xl:block relative">
                <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-terciario" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Buscar ${sneakers.length} pares`}
                  aria-label="Buscar en el catálogo"
                  className="campo w-[180px] 2xl:w-[228px] py-2.5 pl-10 pr-4"
                />
              </form>

              <a
                href={generateDirectWhatsAppContact(settings, 'Asesoría de tallas y disponibilidad')}
                target="_blank"
                rel="noopener noreferrer"
                className="btn hidden sm:inline-flex gap-2 px-[22px] py-3 tracking-[0.18em]"
              >
                <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                Asesoría
              </a>


              {/* Sin acceso al panel: es para la tienda, no para el cliente, y
                  se entra escribiendo /admin. La puerta sigue siendo el
                  servidor, esconder el enlace no protege nada. */}
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
        {navidad && <Luces />}
      </header>

      {/* Menú móvil a pantalla completa */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-obsidian animate-fade lg:hidden flex flex-col">
          <div className="flex items-center justify-between h-[72px] px-5 border-b border-white/8">
            <TempleMark className="w-8 h-8" gorro={navidad} />
            <button
              onClick={() => setIsMenuOpen(false)}
              aria-label="Cerrar menú"
              className="tap -mr-1.5 p-2.5 text-marble"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* El centrado lo hace el hijo con `min-h-full`, no el contenedor con
              `justify-center`. Con `justify-center` sobre el que desborda, un
              acordeón abierto empuja la lista fuera por arriba y el scroll no
              llega hasta ella: "Originales" quedaba inalcanzable y los títulos
              de arriba y abajo, cortados por la mitad. Así, mientras quepa se
              centra, y cuando no, crece y se desplaza entero. */}
          <nav className="flex-1 overflow-y-auto">
            <div className="min-h-full flex flex-col justify-center px-7 sm:px-8 gap-1 py-6">
            {LINEAS.map((linea, i) => (
              <BrandAccordion
                key={linea.to}
                to={linea.to}
                label={linea.label}
                marcas={marcas[linea.linea].principales}
                otras={marcas[linea.linea].otras}
                delay={i * 55}
                /* Elegir una marca no cambia el pathname —solo la
                   querystring—, así que el cierre por cambio de ruta no se
                   dispara y el menú se quedaría abierto encima del catálogo. */
                onNavigate={() => setIsMenuOpen(false)}
              />
            ))}
            {NAV_LINKS.map((link, i) => (
              <NavLink
                key={link.to}
                to={link.to}
                style={{ animationDelay: `${(i + LINEAS.length) * 55}ms` }}
                className={({ isActive }) =>
                  cx(
                    'font-display text-3xl py-3.5 border-b border-white/6 animate-rise transition-colors',
                    isActive ? 'text-marble' : 'text-secundario',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            </div>
          </nav>

          <div className="px-7 sm:px-8 pt-6 pb-safe space-y-3">
            <a
              href={generateDirectWhatsAppContact(settings)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn w-full gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Hablar con un asesor
            </a>
            {igUrl && (
              <a
                href={igUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${settings.storeName} en Instagram`}
                className="flex items-center justify-center gap-2 w-full py-3 text-terciario hover:text-marble text-rotulo font-semibold uppercase tracking-[0.22em] transition-colors"
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
