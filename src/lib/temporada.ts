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

/**
 * La decisión, tomada una vez al cargar la página. Una pestaña que quede
 * abierta cruzando la medianoche del 4 de enero sigue decorada hasta que se
 * recargue, y está bien así: apagar la nieve en plena visita sería más raro.
 */
export const NAVIDAD = esNavidad();
