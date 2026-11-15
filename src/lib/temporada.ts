import type { Sneaker } from '../types';

/**
 * Temporadas del sitio: decoración que se prende y se apaga sola por fecha.
 *
 * Va por fecha y no por un interruptor del panel porque el dueño la quiere
 * encendida desde ya y apagada sin tocar nada: el 4 de enero el sitio vuelve
 * solo a su paleta de siempre, aunque nadie se acuerde de publicar.
 *
 * La fecha se compara en hora de Colombia (-05:00, sin horario de verano), que
 * es donde están los clientes: medianoche en Bogotá, no en el reloj del equipo
 * que compila.
 */

/** Primer instante con decoración navideña. */
const INICIO_NAVIDAD = Date.parse('2026-11-01T00:00:00-05:00');
/** Primer instante sin ella: el 3 de enero es el último día de Navidad. */
const FIN_NAVIDAD = Date.parse('2027-01-04T00:00:00-05:00');

/**
 * Si hoy toca Navidad.
 *
 * `?navidad=si` o `?navidad=no` en la dirección la fuerzan, para revisar el
 * sitio con y sin decoración sin cambiar el reloj. No se guarda en ninguna
 * parte: la siguiente carga sin el parámetro vuelve a mandar la fecha.
 */
export function esNavidad(ahora: number = Date.now()): boolean {
  if (typeof window !== 'undefined') {
    const forzada = new URLSearchParams(window.location.search).get('navidad');
    if (forzada === 'si') return true;
    if (forzada === 'no') return false;
  }
  return ahora >= INICIO_NAVIDAD && ahora < FIN_NAVIDAD;
}

/* ═══ BLACK FRIDAY ════════════════════════════════════════════════════════
   Toda la línea Sneakers a un precio único durante lo que queda de noviembre.
   No se toca el catálogo ni la nube: el precio se cambia al mostrarlo, así que
   el 30 de noviembre a las 11:59:59 p. m. (hora de Colombia) todo vuelve solo
   a su precio normal, sin publicar nada. Los Originales no entran. */

export const PRECIO_BLACK_FRIDAY = 164_900;
const INICIO_BLACK_FRIDAY = Date.parse('2026-11-15T00:00:00-05:00');
/** Primer instante sin Black Friday: el 30 de noviembre termina a las 11:59:59 p. m. */
export const FIN_BLACK_FRIDAY = Date.parse('2026-12-01T00:00:00-05:00');

/**
 * Si hoy es Black Friday. Se pregunta en cada uso, no una vez al cargar: una
 * pestaña abierta al cruzar la medianoche del 30 no puede seguir vendiendo al
 * precio de campaña. `?blackfriday=si` / `?blackfriday=no` la fuerzan.
 */
export function esBlackFriday(ahora: number = Date.now()): boolean {
  if (typeof window !== 'undefined') {
    const forzada = new URLSearchParams(window.location.search).get('blackfriday');
    if (forzada === 'si') return true;
    if (forzada === 'no') return false;
  }
  return ahora >= INICIO_BLACK_FRIDAY && ahora < FIN_BLACK_FRIDAY;
}

/** El par entra a la campaña: es de la línea Sneakers y cuesta más que el precio único. */
export function entraABlackFriday(s: Sneaker): boolean {
  return s.category === 'general' && s.price > PRECIO_BLACK_FRIDAY;
}

/**
 * El par con el precio que rige hoy.
 *
 * El precio anterior que se tacha es el precio normal de ese día (179.900,
 * 189.900…), no el "antes" inflado del catálogo: un descuento de campaña tiene
 * que medirse contra lo que de verdad costaba ayer. Se puede aplicar dos veces
 * sin daño: un par que ya vale 164.900 no vuelve a entrar.
 */
export function conPrecioVigente(s: Sneaker): Sneaker {
  if (!esBlackFriday() || !entraABlackFriday(s)) return s;
  return { ...s, price: PRECIO_BLACK_FRIDAY, originalPrice: s.price };
}

/**
 * La decisión, tomada una vez al cargar la página. Una pestaña que quede
 * abierta cruzando la medianoche del 4 de enero sigue decorada hasta que se
 * recargue, y está bien así: apagar la nieve en plena visita sería más raro.
 */
export const NAVIDAD = esNavidad();
