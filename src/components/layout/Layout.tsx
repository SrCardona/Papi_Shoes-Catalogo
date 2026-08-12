import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { FloatingWhatsApp } from '../ui/FloatingWhatsApp';

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

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
