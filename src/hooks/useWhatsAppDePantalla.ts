import { useLocation } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { generateDirectWhatsAppContact, generateWhatsAppLink } from '../lib/utils';

/**
 * El enlace de WhatsApp del encabezado, con el mensaje de la pantalla en la que
 * se está: el par en su ficha, la línea en su catálogo, un saludo en el resto.
 *
 * La marca no entra en el mensaje aunque se esté filtrando por una: el
 * catálogo consume `?marca=` y limpia la URL al llegar, y después se cambia
 * desde la barra de filtros sin que la ruta se entere. Un mensaje armado con la
 * marca de llegada diría una marca que el cliente ya dejó de mirar.
 */
export function useWhatsAppDePantalla(): string {
  const { settings, sneakers } = useStore();
  const { pathname } = useLocation();

  const ficha = pathname.match(/^\/producto\/([^/]+)/);
  if (ficha) {
    const par = sneakers.find((s) => s.id === decodeURIComponent(ficha[1]));
    if (par) return generateWhatsAppLink(par, null, settings);
  }

  if (pathname.startsWith('/originales')) {
    return generateDirectWhatsAppContact(settings, 'pares de la línea Originales (legit check)');
  }
  if (pathname.startsWith('/sneakers')) {
    return generateDirectWhatsAppContact(settings, 'pares de la línea Sneakers');
  }

  return generateDirectWhatsAppContact(settings);
}
