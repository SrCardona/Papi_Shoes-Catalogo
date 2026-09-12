/**
 * Qué marcas hay en cada línea del catálogo, y a dónde lleva cada una.
 *
 * Funciones puras a propósito, igual que `catalogo.ts`: las usa el hook que
 * alimenta el menú de navegación, pero también se pueden correr fuera de React
 * para comprobar que el conteo que promete el menú es el mismo que se ve al
 * llegar al catálogo filtrado.
 */
import type { Sneaker, SneakerCategory } from '../types';

/** Una marca dentro de una línea, con cuántos pares tiene ahí. */
export interface MarcaConteo {
  brand: string;
  count: number;
}

export interface MarcasPorLinea {
  originales: MarcaConteo[];
  general: MarcaConteo[];
}

/**
 * La etiqueta que pone el generador cuando no reconoce la marca en el nombre
 * del archivo. Sirve como filtro dentro del catálogo, pero no es una marca y no
 * puede encabezar un menú.
 */
export const NO_ES_MARCA = 'Otras';

export function contarMarcas(
  sneakers: Sneaker[],
  category: SneakerCategory,
): MarcaConteo[] {
  const cuenta = new Map<string, number>();
  for (const s of sneakers) {
    if (s.category !== category || s.brand === NO_ES_MARCA) continue;
    cuenta.set(s.brand, (cuenta.get(s.brand) ?? 0) + 1);
  }
  /* Manda el surtido: quien más pares tiene, más arriba. El alfabético desempata
     para que dos marcas con el mismo conteo no bailen de orden entre renders. */
  return [...cuenta.entries()]
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand, 'es'));
}

export function marcasPorLinea(sneakers: Sneaker[]): MarcasPorLinea {
  return {
    originales: contarMarcas(sneakers, 'originales'),
    general: contarMarcas(sneakers, 'general'),
  };
}

/**
 * La línea a la que debe apuntar una marca cuando se la nombra suelta, como en
 * el muro de la portada.
 *
 * Nunca se manda a `/catalogo`: ahí las dos líneas se mezclan y se pierde justo
 * la distinción que sostiene el negocio. En caso de empate gana Originales,
 * que es la opción prudente: quien llega a la línea verificada y ve pares con
 * legit check no se lleva ninguna idea equivocada, mientras que al revés sí.
 */
export function lineaDeMarca(
  marcas: MarcasPorLinea,
  brand: string,
): { to: string; count: number } {
  const enOriginales = marcas.originales.find((m) => m.brand === brand)?.count ?? 0;
  const enGeneral = marcas.general.find((m) => m.brand === brand)?.count ?? 0;

  const to = enOriginales >= enGeneral ? '/originales' : '/sneakers';
  return { to, count: Math.max(enOriginales, enGeneral) };
}
