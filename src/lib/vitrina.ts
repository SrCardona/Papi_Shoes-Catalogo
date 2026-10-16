import type { Sneaker, SneakerCategory } from '../types';
import { RECORTES } from '../data/recortesGenerados';

/**
 * La imagen con la que un par sale en las vitrinas del rediseño: rankings,
 * carruseles y cuadrícula.
 *
 * El recorte sin fondo si la portada tiene uno aprobado, y si no la portada
 * tal cual. Este es el único sitio que decide, así que ninguna pantalla tiene
 * que saber cuáles pares lo tienen.
 *
 * Se busca por la URL de la portada y no por el id del par: si el panel le
 * cambia la foto a un par, la URL nueva no está en el manifiesto y sale la foto
 * nueva, en vez del recorte de la vieja.
 */
export function fotoDeVitrina(sneaker: Sneaker): string {
  const portada = sneaker.images[0] ?? '';
  return RECORTES[portada]?.src ?? portada;
}

/** Si el par sale recortado: sin fondo hay que darle aire, con foto no. */
export function tieneRecorte(sneaker: Sneaker): boolean {
  return Boolean(RECORTES[sneaker.images[0] ?? '']);
}

export const RUTA_DE_LINEA: Record<SneakerCategory, string> = {
  originales: '/originales',
  general: '/sneakers',
};

export const NOMBRE_DE_LINEA: Record<SneakerCategory, string> = {
  originales: 'Originales',
  general: 'Sneakers',
};
