import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Instagram, Menu, MessageCircle, Search, Shield, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useMarcasAgrupadas } from '../../hooks/useMarcasPorLinea';
import { useWhatsAppDePantalla } from '../../hooks/useWhatsAppDePantalla';
import { TempleMark } from '../ui/TempleMark';
import { BrandAccordion, BrandDropdown } from './BrandDropdown';
import { BuscadorEncabezado } from './BuscadorEncabezado';
import { cx, instagramUrl } from '../../lib/utils';

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

/**
 * Encabezado compacto: logo, las dos líneas, buscador y WhatsApp en una sola
 * franja. Lo demás —El Templo, Preguntas, el panel, Instagram— vive en el menú,
 * que ahora se abre también en escritorio.
 *
 * Va siempre opaco y siempre a la misma altura (`--alto-encabezado`, en
 * index.css): la barra de filtros del catálogo se pega justo debajo y necesita
 * saber dónde termina. El que se esconde al bajar es ella, no él; si se movieran
 * los dos, el catálogo saltaría bajo el dedo.
 */
export function Navbar() {
  const { settings } = useStore();
  const marcas = useMarcasAgrupadas();
  const location = useLocation();
  const enlaceWhatsApp = useWhatsAppDePantalla();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuOpenedAt, setMenuOpenedAt] = useState(location.pathname);
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [buscadorAbiertoEn, setBuscadorAbiertoEn] = useState(location.pathname);

  const igUrl = instagramUrl(settings.instagramHandle);
  const enFicha = location.pathname.startsWith('/producto/');

  // El menú y el buscador del celular se cierran al cambiar de ruta. Ajustar el
  // estado durante el render (en vez de en un efecto) evita el parpadeo de un
  // render intermedio con el panel todavía abierto sobre la vista nueva.
  if (isMenuOpen && menuOpenedAt !== location.pathname) {
    setIsMenuOpen(false);
  }
  if (buscadorAbierto && buscadorAbiertoEn !== location.pathname) {
    setBuscadorAbierto(false);
  }

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [isMenuOpen]);

  const openMenu = () => {
    setMenuOpenedAt(location.pathname);
    setIsMenuOpen(true);
  };

  const alternarBuscador = () => {
    setBuscadorAbiertoEn(location.pathname);
    setBuscadorAbierto((v) => !v);
  };

  return (
    <>
      {settings.showAnnouncement && (
        <div className="bg-lapis text-marble overflow-hidden">
          <p className="py-1.5 text-center text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.28em] px-4 truncate">
            {settings.announcement}
          </p>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-obsidian border-b border-white/8">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-5 lg:px-8">
          <div className="flex items-center h-[var(--alto-encabezado)] gap-3 sm:gap-5">
            <Link
              to="/"
              className="flex items-center gap-2.5 shrink-0 group"
              aria-label={`${settings.storeName} — inicio`}
            >
              <TempleMark className="w-7 h-7 transition-transform duration-500 group-hover:-translate-y-0.5" />
              <span className="font-display text-engraved text-base sm:text-lg leading-none">
                {settings.storeName}
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-7 shrink-0">
              {LINEAS.map((linea) => (
                <BrandDropdown
                  key={linea.to}
                  to={linea.to}
                  label={linea.label}
                  marcas={marcas[linea.linea].principales}
                  otras={marcas[linea.linea].otras}
                />
              ))}
            </nav>

            <BuscadorEncabezado className="hidden md:block flex-1 max-w-md mx-auto" />

            <div className="flex items-center gap-1 sm:gap-2 ml-auto md:ml-0 shrink-0">
              <button
                type="button"
                onClick={alternarBuscador}
                aria-label={buscadorAbierto ? 'Cerrar buscador' : 'Buscar'}
                aria-expanded={buscadorAbierto}
                className="tap md:hidden p-2.5 text-marble"
              >
                {buscadorAbierto ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
              </button>

              {/* El botón de la casa. En la ficha pregunta por ese par; por eso
                  cambia el rótulo, para que se sepa qué mensaje va a salir. */}
              <a
                href={enlaceWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={enFicha ? 'Cotizar este par por WhatsApp' : 'Escribir por WhatsApp'}
                className="flex items-center gap-2 h-9 px-2.5 sm:px-4 bg-lapis text-marble text-[10px] font-bold uppercase tracking-[0.18em] hover:bg-lapis-lit transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">{enFicha ? 'Cotizar' : 'WhatsApp'}</span>
              </a>

              <button
                type="button"
                onClick={openMenu}
                aria-label="Abrir menú"
                className="tap -mr-1.5 p-2.5 text-marble"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* En el celular el buscador baja bajo la franja en vez de apretarla:
            a 390 px no caben logo, campo y dos botones sin cortar el campo. */}
        {buscadorAbierto && (
          <div className="md:hidden border-t border-white/8 px-4 py-3 bg-obsidian animate-drop">
            <BuscadorEncabezado autoFocus onNavegar={() => setBuscadorAbierto(false)} />
          </div>
        )}
      </header>

      {/* Menú: pantalla completa en el celular, cajón lateral en escritorio. */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Cerrar menú"
            tabIndex={-1}
            onClick={() => setIsMenuOpen(false)}
            className="hidden lg:block flex-1 bg-obsidian/70 animate-fade"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
            className="w-full lg:w-[420px] bg-obsidian lg:border-l border-white/8 animate-fade flex flex-col"
          >
            <div className="flex items-center justify-between h-[var(--alto-encabezado)] px-5 border-b border-white/8">
              <TempleMark className="w-7 h-7" />
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
                        isActive ? 'text-marble' : 'text-marble/45 hover:text-marble/80',
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
                href={enlaceWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-4 bg-lapis text-marble text-[11px] font-bold uppercase tracking-[0.22em] hover:bg-lapis-lit transition-colors"
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
        </div>
      )}
    </>
  );
}
