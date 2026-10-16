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

/** Cuántos pares lleva cada ranking de la portada. */
export const PUESTOS_RANKING = 5;

const masReciente = (a: Sneaker, b: Sneaker) => b.createdAt.localeCompare(a.createdAt);

/**
 * Un ranking de una línea a partir de la lista escrita a mano.
 *
 * Se salta lo que no existe, lo agotado y lo que es de la otra línea, y los
 * puestos que queden libres se llenan con lo más reciente de la línea. Un id
 * mal copiado o un par vendido no deben dejar la portada con un hueco.
 */
export function armarRanking(
  sneakers: Sneaker[],
  ids: string[],
  linea: SneakerCategory,
): Sneaker[] {
  const aLaVenta = (s: Sneaker | undefined): s is Sneaker =>
    Boolean(s && s.category === linea && s.status !== 'agotado');
  const porId = new Map(sneakers.map((s) => [s.id, s]));

  const elegidos = ids.map((id) => porId.get(id)).filter(aLaVenta);
  const unicos = [...new Set(elegidos)].slice(0, PUESTOS_RANKING);
  if (unicos.length === PUESTOS_RANKING) return unicos;

  const relleno = sneakers
    .filter((s) => aLaVenta(s) && !unicos.includes(s))
    .sort(masReciente);
  return [...unicos, ...relleno].slice(0, PUESTOS_RANKING);
}

/**
 * Lo último que entró, sin que un lote entero de una marca se coma la fila:
 * un lote llega con la misma fecha, y sin tope la fila sería de una sola casa.
 * Si con el tope no se llena, se completa con lo siguiente más reciente.
 */
export function recienLlegados(sneakers: Sneaker[], cuantos: number, topePorMarca = 3): Sneaker[] {
  const recientes = sneakers.filter((s) => s.status !== 'agotado').sort(masReciente);
  const fila: Sneaker[] = [];
  const porMarca = new Map<string, number>();
  for (const s of recientes) {
    if (fila.length === cuantos) break;
    const usados = porMarca.get(s.brand) ?? 0;
    if (usados >= topePorMarca) continue;
    porMarca.set(s.brand, usados + 1);
    fila.push(s);
  }
  for (const s of recientes) {
    if (fila.length === cuantos) break;
    if (!fila.includes(s)) fila.push(s);
  }
  return fila;
}

export const RUTA_DE_LINEA: Record<SneakerCategory, string> = {
  originales: '/originales',
  general: '/sneakers',
};

export const NOMBRE_DE_LINEA: Record<SneakerCategory, string> = {
  originales: 'Originales',
  general: 'Sneakers',
};
