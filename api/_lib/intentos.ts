/**
 * Bloqueo por intentos fallidos, del lado del servidor.
 *
 * El panel ya cuenta intentos en el navegador, pero eso solo estorba a quien
 * usa el panel: quien ataca llama directo a `/api/sesion` y ese contador no
 * existe para él. Un PIN de seis dígitos son un millón de combinaciones, que
 * sin freno se prueban en horas.
 *
 * El contador vive en el mismo almacén que el catálogo porque las funciones son
 * efímeras: cada llamada puede caer en una instancia nueva y una variable en
 * memoria no sobreviviría.
 *
 * Ese archivo queda en el mismo almacén público que el catálogo, así que se
 * escribe pensando en que se puede leer: la IP nunca va en claro, solo un HMAC
 * recortado, y nada de lo que hay ahí sirve para entrar. Lo único que protege es
 * el conteo.
 *
 * DOS FRENOS, Y POR QUÉ SON DOS
 * ─────────────────────────────
 * 1. **Por huella de IP**, con bloqueo que se alarga en cada reincidencia. Es
 *    el que corta a quien insiste desde un mismo sitio. Nunca es global, para
 *    que nadie pueda dejar al dueño afuera de su propio panel a punta de
 *    intentos fallidos.
 * 2. **Demora global**, que crece con los fallos de la última hora en todo el
 *    sitio. El freno por IP no toca a quien rota direcciones —y rotarlas es
 *    barato—, así que hacía falta algo que no dependiera de cuál sea la IP.
 *    Es demora y no bloqueo justamente para no reabrir el problema de arriba:
 *    por muchos fallos que acumule un atacante, el dueño siempre puede entrar;
 *    solo espera unos segundos de más.
 *
 * LO QUE ESTE CONTADOR NO PUEDE HACER
 * ───────────────────────────────────
 * Leer, sumar y volver a escribir un archivo no es una operación atómica, y el
 * almacén no ofrece ninguna que lo sea. Dos peticiones a la vez leen el mismo
 * número y la última escritura tapa a la anterior, así que un atacante que
 * dispare en paralelo puede hacer que el conteo avance más despacio de lo que
 * debería. Es justamente el hueco que tapa la demora global: esa se cobra
 * siempre, cuente lo que cuente el archivo.
 */
import { escribirJson, leerJson } from './almacen.js';

const RUTA = 'intentos.json';
const MAX_FALLOS = 5;

/** Primer bloqueo. Cada reincidencia lo dobla, hasta el tope. */
const BLOQUEO_BASE_MS = 15 * 60 * 1000;
const BLOQUEO_TOPE_MS = 4 * 60 * 60 * 1000;

/** Los fallos sueltos se olvidan: el que erró ayer no arranca castigado. */
const OLVIDO_MS = 60 * 60 * 1000;

/** Demora mínima de toda respuesta fallida, haya o nada de por medio. */
export const CASTIGO_BASE_MS = 400;
/** A partir de cuántos fallos por hora en todo el sitio se empieza a demorar. */
const GLOBAL_UMBRAL = 20;
/** Cuánto suma cada fallo por encima del umbral, y hasta dónde. */
const GLOBAL_PASO_MS = 150;
/* Con holgura por debajo del límite de duración de la función. */
const GLOBAL_TOPE_MS = 4000;

interface Registro {
  fallos: number;
  ultimo: number;
  bloqueadoHasta: number;
  /** Cuántas veces ya se bloqueó esta huella. Alarga el siguiente castigo. */
  castigos?: number;
}

interface Archivo {
  huellas: Record<string, Registro>;
  /** Momentos de los fallos recientes de todo el sitio, para la demora global. */
  globales: number[];
}

async function leerArchivo(): Promise<Archivo> {
  const lectura = await leerJson<Partial<Archivo>>(RUTA);
  /* Si el almacén no responde se sigue sin contador. Es la decisión menos mala:
     lo contrario sería dejar al dueño afuera de su panel cada vez que el almacén
     tenga un mal minuto, y el PIN se sigue verificando igual. */
  if (lectura.estado !== 'ok') return { huellas: {}, globales: [] };
  const valor = lectura.valor;
  if (!valor || typeof valor !== 'object') return { huellas: {}, globales: [] };
  return {
    huellas:
      valor.huellas && typeof valor.huellas === 'object' ? valor.huellas : {},
    globales: Array.isArray(valor.globales) ? valor.globales : [],
  };
}

/** Deja fuera lo vencido para que el archivo no crezca sin fin. */
function podar(archivo: Archivo): Archivo {
  const ahora = Date.now();
  const huellas: Record<string, Registro> = {};
  for (const [huella, registro] of Object.entries(archivo.huellas)) {
    const vigente =
      registro.bloqueadoHasta > ahora || ahora - registro.ultimo < OLVIDO_MS;
    if (vigente) huellas[huella] = registro;
  }
  return {
    huellas,
    globales: archivo.globales.filter((cuando) => ahora - cuando < OLVIDO_MS),
  };
}

function demoraPor(fallosRecientes: number): number {
  const exceso = Math.max(0, fallosRecientes - GLOBAL_UMBRAL);
  return Math.min(exceso * GLOBAL_PASO_MS, GLOBAL_TOPE_MS);
}

/** Minutos que le faltan a esta huella para poder reintentar, o 0. */
export async function minutosBloqueado(huella: string): Promise<number> {
  const registro = (await leerArchivo()).huellas[huella];
  if (!registro || registro.bloqueadoHasta <= Date.now()) return 0;
  return Math.ceil((registro.bloqueadoHasta - Date.now()) / 60000);
}

export interface Fallo {
  /** Intentos que le quedan a esta huella antes del bloqueo. */
  restantes: number;
  /** Cuánto hay que demorar la respuesta antes de contestar. */
  esperaMs: number;
}

/** Suma un fallo y dice cuántos intentos quedan y cuánto hay que demorar. */
export async function registraFallo(huella: string): Promise<Fallo> {
  const ahora = Date.now();
  const archivo = podar(await leerArchivo());
  const previo = archivo.huellas[huella];
  const fallos =
    previo && ahora - previo.ultimo < OLVIDO_MS ? previo.fallos + 1 : 1;

  const toca = fallos >= MAX_FALLOS;
  const castigos = (previo?.castigos ?? 0) + (toca ? 1 : 0);

  archivo.huellas[huella] = {
    fallos: toca ? 0 : fallos,
    ultimo: ahora,
    /* Cada reincidencia dobla la espera: quien vuelve por quinta vez no merece
       el mismo cuarto de hora que quien se equivocó de tecla una tarde. */
    bloqueadoHasta: toca
      ? ahora +
        Math.min(BLOQUEO_BASE_MS * 2 ** (castigos - 1), BLOQUEO_TOPE_MS)
      : 0,
    castigos,
  };
  archivo.globales.push(ahora);

  try {
    await escribirJson(RUTA, archivo);
  } catch {
    /* Si el almacén falla no se puede negar el acceso por eso: el PIN ya se
       verificó y la respuesta al usuario no depende de este contador. */
  }

  return {
    restantes: Math.max(0, MAX_FALLOS - fallos),
    esperaMs: CASTIGO_BASE_MS + demoraPor(archivo.globales.length),
  };
}

export async function limpiaFallos(huella: string): Promise<void> {
  const archivo = podar(await leerArchivo());
  if (!(huella in archivo.huellas)) return;
  delete archivo.huellas[huella];
  try {
    await escribirJson(RUTA, archivo);
  } catch {
    /* mismo criterio que arriba */
  }
}
