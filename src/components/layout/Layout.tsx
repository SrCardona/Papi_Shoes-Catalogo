import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { FloatingWhatsApp } from '../ui/FloatingWhatsApp';
import { useStore } from '../../context/StoreContext';

/**
 * Devuelve el scroll al inicio en cada cambio de vista.
 *
 * El cuerpo del efecto va entre llaves a propósito: una flecha sin llaves
 * devuelve el resultado de `window.scrollTo`, y React toma ese valor de retorno
 * como la función de limpieza del efecto. Si no es una función, revienta con
 * "destroy is not a function" al cambiar de ruta.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // Con ancla (por ejemplo /nosotros#entregas) mandamos el scroll a la
    // sección. Se aplaza un frame porque el destino todavía no está montado
    // en el momento en que cambia la ruta.
    if (hash) {
      const id = hash.slice(1);
      const frame = requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      });
      return () => cancelAnimationFrame(frame);
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);

  return null;
}

/**
 * Mantiene el título de la pestaña al día con el nombre configurado.
 *
 * El `<title>` de index.html es solo lo que se ve antes de que arranque React:
 * es un archivo estático y no puede leer los ajustes. La ficha de producto pone
 * su propio título con el nombre del par, y aquí se respeta: los efectos de los
 * hijos corren antes que los del padre, así que sin esta guarda este efecto le
 * pisaría el título a la ficha.
 */
function DocumentTitle() {
  const { settings } = useStore();
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname.startsWith('/producto/')) return;
    document.title = settings.tagline
      ? `${settings.storeName} — ${settings.tagline}`
      : settings.storeName;
  }, [pathname, settings.storeName, settings.tagline]);

  return null;
}

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <DocumentTitle />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
