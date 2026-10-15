import type { Sneaker, SneakerCategory } from '../types';

/**
 * La imagen con la que un par sale en las vitrinas del rediseño: rankings,
 * carruseles y cuadrícula.
 *
 * Hoy es la portada del par. Cuando existan los recortes sin fondo, este es el
 * único sitio que decide entre el recorte y la foto, así que ninguna pantalla
 * tiene que saber cuáles pares lo tienen.
 */
export function fotoDeVitrina(sneaker: Sneaker): string {
  return sneaker.images[0] ?? '';
}

export const RUTA_DE_LINEA: Record<SneakerCategory, string> = {
  originales: '/originales',
  general: '/sneakers',
};

export const NOMBRE_DE_LINEA: Record<SneakerCategory, string> = {
  originales: 'Originales',
  general: 'Sneakers',
};
