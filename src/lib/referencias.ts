import type { Sneaker } from '../types';

/**
 * Las referencias PAPI-xxxx del panel. La del catálogo generado la reparte
 * `scripts/generar-catalogo.mjs` con `catalogo/referencias.json`; estas dos
 * cuidan las que se escriben o se crean a mano.
 *
 * La referencia es lo que se dice por WhatsApp para no confundir dos pares, así
 * que una repetida anula justo eso.
 */

/**
 * El par que ya usa esa referencia, sin contar el que se está editando. Se
 * compara sin mayúsculas ni espacios de los extremos: "papi-3389 " y
 * "PAPI-3389" se leen igual por WhatsApp.
 */
export function parConReferencia(
  pares: Sneaker[],
  referencia: string,
  idPropio?: string,
): Sneaker | undefined {
  const buscada = referencia.trim().toLowerCase();
  if (!buscada) return undefined;
  return pares.find(
    (s) => s.id !== idPropio && s.sku.trim().toLowerCase() === buscada,
  );
}

/**
 * Una referencia que ningún par usa. Antes se sorteaba a ciegas entre 9.000
 * números, y un par cargado desde el panel podía salir con la misma que otro.
 * Parte de un número al azar y avanza hasta el primero libre.
 */
export function referenciaLibre(pares: Sneaker[], azar: () => number = Math.random): string {
  const usadas = new Set(pares.map((s) => s.sku.trim().toLowerCase()));
  let n = Math.floor(1000 + azar() * 9000);
  for (let intentos = 0; intentos < 9000; intentos++) {
    const ref = `PAPI-${n}`;
    if (!usadas.has(ref.toLowerCase())) return ref;
    n = n === 9999 ? 1000 : n + 1;
  }
  return `PAPI-${Date.now()}`;
}
