/**
 * Sesión de escritura del panel, verificada en el servidor.
 *
 * El bundle del navegador no puede guardar un secreto: cualquiera lo abre y lo
 * lee. Así que el PIN se compara acá contra `ADMIN_PIN_HASH` —variable de
 * entorno de Vercel, nunca del repositorio— y a cambio se entrega un token
 * firmado con `ADMIN_SESSION_SECRET`. Ese token es lo único que el navegador
 * guarda, dura dos horas y es lo que autoriza a escribir en la nube.
 *
 * El formato del hash es el mismo SHA-256 que ya calcula el panel en
 * Ajustes › Seguridad › "Hash para Vercel", para no obligar a rehacer nada.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const DURACION_MS = 2 * 60 * 60 * 1000;

const HASH_ADMIN = (process.env.ADMIN_PIN_HASH ?? '').trim().toLowerCase();
const SECRETO = (process.env.ADMIN_SESSION_SECRET ?? '').trim();

/** Un hash mal pegado se trata como si no existiera, no como credencial rara. */
export const pinConfigurado = /^[a-f0-9]{64}$/.test(HASH_ADMIN);
export const secretoConfigurado = SECRETO.length >= 24;
export const sesionDisponible = pinConfigurado && secretoConfigurado;

/** Regla única del formato del PIN, la misma que usa el panel. */
export const FORMATO_PIN = /^\d{6,12}$/;

function firma(payload: string): string {
  return createHmac('sha256', SECRETO).update(payload).digest('base64url');
}

/** Comparación en tiempo constante, para no filtrar nada por la duración. */
function igual(a: string, b: string): boolean {
  const uno = Buffer.from(a, 'utf8');
  const dos = Buffer.from(b, 'utf8');
  return uno.length === dos.length && timingSafeEqual(uno, dos);
}

export function pinCorrecto(pin: string): boolean {
  if (!pinConfigurado) return false;
  const recibido = createHash('sha256').update(pin, 'utf8').digest('hex');
  return igual(recibido, HASH_ADMIN);
}

export function emiteToken(): { token: string; expiraEn: number } {
  const expiraEn = Date.now() + DURACION_MS;
  const payload = Buffer.from(JSON.stringify({ exp: expiraEn })).toString(
    'base64url',
  );
  return { token: `${payload}.${firma(payload)}`, expiraEn };
}

/** Verifica la cabecera `Authorization: Bearer …` de una petición de escritura. */
export function tokenValido(cabecera: string | null): boolean {
  if (!sesionDisponible || !cabecera) return false;

  const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7).trim() : '';
  const [payload, sello] = token.split('.');
  if (!payload || !sello) return false;
  if (!igual(sello, firma(payload))) return false;

  try {
    const datos = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as { exp?: number };
    return typeof datos.exp === 'number' && datos.exp > Date.now();
  } catch {
    return false;
  }
}

/** Identifica quién intenta entrar sin guardar su IP en claro. */
export function huellaDeIp(request: Request): string {
  const cabeceras = request.headers;
  const cruda =
    cabeceras.get('x-real-ip') ??
    cabeceras.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'desconocida';
  return createHmac('sha256', SECRETO || 'sin-secreto')
    .update(cruda)
    .digest('hex')
    .slice(0, 24);
}
