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
 * memoria no sobreviviría. El bloqueo es por huella de IP y no global, así nadie
 * puede dejar al dueño afuera de su propio panel a punta de intentos fallidos.
 *
 * Ese archivo queda en el mismo almacén público que el catálogo, así que se
 * escribe pensando en que se puede leer: la IP nunca va en claro, solo un HMAC
 * recortado, y nada de lo que hay ahí sirve para entrar. Lo único que protege es
 * el conteo.
 */
import { escribirJson, leerJson } from './almacen';

const RUTA = 'intentos.json';
const MAX_FALLOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;
/** Los fallos sueltos se olvidan: el que erró ayer no arranca castigado. */
const OLVIDO_MS = 60 * 60 * 1000;

interface Registro {
  fallos: number;
  ultimo: number;
  bloqueadoHasta: number;
}

type Tabla = Record<string, Registro>;

async function leerTabla(): Promise<Tabla> {
  const lectura = await leerJson<Tabla>(RUTA);
  /* Si el almacén no responde se sigue sin contador. Es la decisión menos mala:
     lo contrario sería dejar al dueño afuera de su panel cada vez que el almacén
     tenga un mal minuto, y el PIN se sigue verificando igual. */
  if (lectura.estado !== 'ok') return {};
  const tabla = lectura.valor;
  return tabla && typeof tabla === 'object' ? tabla : {};
}

/** Deja fuera lo vencido para que el archivo no crezca sin fin. */
function podar(tabla: Tabla): Tabla {
  const ahora = Date.now();
  const limpia: Tabla = {};
  for (const [huella, registro] of Object.entries(tabla)) {
    const vigente =
      registro.bloqueadoHasta > ahora || ahora - registro.ultimo < OLVIDO_MS;
    if (vigente) limpia[huella] = registro;
  }
  return limpia;
}

/** Minutos que le faltan a esta huella para poder reintentar, o 0. */
export async function minutosBloqueado(huella: string): Promise<number> {
  const registro = (await leerTabla())[huella];
  if (!registro || registro.bloqueadoHasta <= Date.now()) return 0;
  return Math.ceil((registro.bloqueadoHasta - Date.now()) / 60000);
}

/** Suma un fallo y devuelve cuántos intentos quedan antes del bloqueo. */
export async function registraFallo(huella: string): Promise<number> {
  const ahora = Date.now();
  const tabla = podar(await leerTabla());
  const previo = tabla[huella];
  const fallos =
    previo && ahora - previo.ultimo < OLVIDO_MS ? previo.fallos + 1 : 1;

  tabla[huella] = {
    fallos: fallos >= MAX_FALLOS ? 0 : fallos,
    ultimo: ahora,
    bloqueadoHasta: fallos >= MAX_FALLOS ? ahora + BLOQUEO_MS : 0,
  };

  try {
    await escribirJson(RUTA, tabla);
  } catch {
    /* Si el almacén falla no se puede negar el acceso por eso: el PIN ya se
       verificó y la respuesta al usuario no depende de este contador. */
  }
  return Math.max(0, MAX_FALLOS - fallos);
}

export async function limpiaFallos(huella: string): Promise<void> {
  const tabla = podar(await leerTabla());
  if (!(huella in tabla)) return;
  delete tabla[huella];
  try {
    await escribirJson(RUTA, tabla);
  } catch {
    /* mismo criterio que arriba */
  }
}
