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

/**
 * Cuántos pares necesita una marca, dentro de una línea, para tener su propio
 * apartado en el menú. Por debajo de eso cae en "Otras marcas".
 *
 * Se evalúa por línea y no en total, a propósito: una marca puede sostener su
 * apartado en Sneakers y no en Originales. Es lo correcto, porque el menú que
 * el visitante está mirando es el de una línea.
 */
export const MINIMO_PARA_APARTADO_PROPIO = 5;

/**
 * El valor de `?marca=` que representa al grupo, no a una marca.
 *
 * Va en minúsculas y se compara sin distinguir mayúsculas, así que un enlace a
 * `?marca=Otras` —el nombre literal de la etiqueta del generador— cae también
 * en el grupo. Es lo que se quiere: esos pares viven justamente ahí dentro.
 */
export const MARCA_OTRAS = 'otras';

/** Las marcas agrupadas de una línea y cuántos pares suman entre todas. */
export interface GrupoOtras {
  /** Todas las marcas del grupo, para filtrar por el conjunto. */
  brands: string[];
  count: number;
}

export interface MarcasAgrupadas {
  principales: MarcaConteo[];
  otras: GrupoOtras;
}

/** Si `?marca=` trae el valor especial del grupo en vez de una marca. */
export function esGrupoOtras(valor: string): boolean {
  return valor.trim().toLowerCase() === MARCA_OTRAS;
}

/**
 * Las marcas de una línea, repartidas entre las que tienen apartado propio y
 * las que se agrupan bajo "Otras marcas".
 *
 * Es la única fuente de verdad del reparto: la usan el menú y el catálogo. Si
 * cada uno lo calculara por su lado, el día que cambie el umbral o entre una
 * marca nueva el conteo que promete el menú dejaría de ser el que se ve al
 * llegar, y esa desconfianza es difícil de recuperar.
 *
 * Al grupo entran dos cosas distintas que al visitante le dan igual: las marcas
 * reales por debajo del umbral y los pares que el generador etiquetó `Otras`
 * por no reconocer la marca en el nombre del archivo. Esos últimos antes no
 * aparecían en ningún menú, así que no había forma de llegar a ellos navegando.
 */
export function agruparMarcas(
  sneakers: Sneaker[],
  category: SneakerCategory,
  minimo: number = MINIMO_PARA_APARTADO_PROPIO,
): MarcasAgrupadas {
  const conMarca = contarMarcas(sneakers, category);
  const principales = conMarca.filter((m) => m.count >= minimo);
  const chicas = conMarca.filter((m) => m.count < minimo);

  /* `contarMarcas` deja fuera la etiqueta del generador porque no es una marca
     y no puede encabezar un menú. Aquí sí hace falta contarla: es el resto del
     mismo cajón. */
  const sinMarca = sneakers.filter(
    (s) => s.category === category && s.brand === NO_ES_MARCA,
  ).length;

  /* Alfabético para el renglón "Incluye", que se lee de corrido; la etiqueta
     del generador va al final porque no es un nombre que el cliente reconozca. */
  const brands = chicas
    .map((m) => m.brand)
    .sort((a, b) => a.localeCompare(b, 'es'));
  if (sinMarca > 0) brands.push(NO_ES_MARCA);

  return {
    principales,
    otras: {
      brands,
      count: chicas.reduce((n, m) => n + m.count, 0) + sinMarca,
    },
  };
}

/**
 * Los nombres del grupo que sí se le pueden enseñar al cliente.
 *
 * Deja fuera la etiqueta del generador: "Incluye: Calvin Klein, Otras" no dice
 * nada. Quien quiera nombrar ese resto tiene `restoSinMarca` para decidir si
 * añade un "y marcas sueltas" al final.
 */
export function marcasVisiblesDelGrupo(otras: GrupoOtras): {
  nombres: string[];
  restoSinMarca: boolean;
} {
  return {
    nombres: otras.brands.filter((b) => b !== NO_ES_MARCA),
    restoSinMarca: otras.brands.includes(NO_ES_MARCA),
  };
}
