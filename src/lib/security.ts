/**
 * Capa de seguridad del panel, del lado del navegador.
 *
 * NOTA IMPORTANTE PARA EL DUEÑO DEL PROYECTO
 * ──────────────────────────────────────────
 * Lo de aquí NO es lo que protege el sitio publicado. Cuando están configuradas
 * `ADMIN_PIN_HASH` y `ADMIN_SESSION_SECRET`, el PIN lo compara el servidor
 * (`api/sesion.ts`) y solo él puede autorizar un cambio en la nube. Este archivo
 * cubre dos cosas distintas:
 *
 *   · El modo sin servidor —desarrollo local, o un despliegue al que le faltan
 *     las variables—, donde el PIN se crea en el primer ingreso y vive en el
 *     navegador del dueño. Ahí la validación se puede saltar leyendo el código:
 *     frena a un visitante casual y nada más, y los cambios no salen del equipo.
 *   · El saneamiento de URLs y de texto, que sí importa siempre: se aplica antes
 *     de guardar y otra vez en el servidor antes de publicar.
 *
 * El código no distribuye ningún PIN, ni en claro ni con hash, y no existe
 * ningún acceso maestro alterno.
 */

/**
 * Los navegadores solo exponen `crypto.subtle` y `crypto.randomUUID` en
 * "contextos seguros": https, o http en localhost. Si abres el sitio por la IP
 * de la red (por ejemplo http://192.168.1.20:3000 desde el celular), esas APIs
 * no existen y cualquier llamada directa reventaría la aplicación.
 */
export const isSecureContextAvailable = (): boolean =>
  typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';

/** Identificador único, con alternativa si `randomUUID` no está disponible. */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** SHA-256 en hexadecimal usando Web Crypto (nativo del navegador). */
export async function sha256(text: string): Promise<string> {
  if (!isSecureContextAvailable()) {
    throw new Error(
      'Tu navegador bloquea el cifrado porque el sitio no se abrió en un contexto seguro. ' +
        'Entra por http://localhost:3000 en vez de la IP de la red, o publica el sitio con https.',
    );
  }
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Comparación en tiempo constante: no filtra información por la duración. */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ── Token de sesión ──────────────────────────────────────────────────────
   Antes bastaba con `sessionStorage.papi_admin_auth = 'true'`. Ahora la
   sesión es un token aleatorio que solo existe si el login lo generó, con
   caducidad de 2 horas.                                                    */

const SESSION_KEY = 'papi_session';
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

interface SessionToken {
  nonce: string;
  issuedAt: number;
  fingerprint: string;
}

async function fingerprint(): Promise<string> {
  return sha256(`${navigator.userAgent}|${location.origin}`);
}

export async function issueSession(): Promise<void> {
  const token: SessionToken = {
    nonce: uuid(),
    issuedAt: Date.now(),
    fingerprint: await fingerprint(),
  };
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(token));
  } catch {
    /* almacenamiento bloqueado: la sesión durará solo esta carga de página */
  }
}

export async function hasValidSession(): Promise<boolean> {
  if (!isSecureContextAvailable()) return false;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const token = JSON.parse(raw) as SessionToken;
    if (!token.nonce || !token.issuedAt) return false;
    if (Date.now() - token.issuedAt > SESSION_TTL_MS) {
      clearSession();
      return false;
    }
    return safeCompare(token.fingerprint ?? '', await fingerprint());
  } catch {
    return false;
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* almacenamiento bloqueado */
  }
}

/* ── Bloqueo por intentos fallidos ───────────────────────────────────────── */

const ATTEMPTS_KEY = 'papi_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

interface AttemptRecord {
  count: number;
  lockedUntil: number;
}

function readAttempts(): AttemptRecord {
  try {
    return (
      JSON.parse(localStorage.getItem(ATTEMPTS_KEY) ?? '') ?? {
        count: 0,
        lockedUntil: 0,
      }
    );
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

/** Minutos restantes de bloqueo, o 0 si se puede intentar. */
export function lockoutRemainingMinutes(): number {
  const { lockedUntil } = readAttempts();
  if (lockedUntil <= Date.now()) return 0;
  return Math.ceil((lockedUntil - Date.now()) / 60000);
}

export function registerFailedAttempt(): number {
  const rec = readAttempts();
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockedUntil = Date.now() + LOCKOUT_MS;
    rec.count = 0;
  }
  try {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(rec));
  } catch {
    /* almacenamiento bloqueado */
  }
  return MAX_ATTEMPTS - rec.count;
}

export function resetAttempts(): void {
  try {
    localStorage.removeItem(ATTEMPTS_KEY);
  } catch {
    /* almacenamiento bloqueado */
  }
}

/* ── Saneamiento de URLs de imagen ────────────────────────────────────────
   Antes se aceptaba cualquier cadena, incluido `javascript:`. Ahora solo
   pasan https, data:image y rutas propias del sitio.                       */

const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#1a1a1a"/><text x="200" y="205" font-family="sans-serif" font-size="17" fill="#5a5a5a" text-anchor="middle">Sin imagen</text></svg>`,
  );

export function sanitizeImageUrl(url: unknown): string {
  if (typeof url !== 'string') return PLACEHOLDER;
  const trimmed = url.trim();
  if (/^https:\/\/[^\s"'<>]+$/i.test(trimmed)) return trimmed;
  if (/^data:image\/(png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i.test(trimmed))
    return trimmed;

  /* Fotos servidas por el propio sitio: /catalogo/jordan-1-unc-toe.jpg
     Es la vía recomendada para catálogos grandes, porque el `localStorage`
     del navegador no aguanta decenas de fotos en base64.

     Se exige ruta absoluta con extensión de imagen conocida, y se rechaza
     `//otro-dominio.com/x.jpg` (que el navegador leería como protocolo
     relativo, es decir, otro servidor) y cualquier `..` que intente salir
     de la carpeta pública. */
  if (
    !trimmed.startsWith('//') &&
    !trimmed.includes('..') &&
    /^\/[a-z0-9._~\-/%()'!*+,&=:@ ]+\.(png|jpe?g|gif|webp|avif)$/i.test(trimmed)
  ) {
    return trimmed;
  }

  return PLACEHOLDER;
}

export const IMAGE_PLACEHOLDER = PLACEHOLDER;

/** Recorta y limpia texto libre antes de guardarlo. */
export function sanitizeText(value: unknown, maxLength = 600): string {
  if (typeof value !== 'string') return '';
  // Los caracteres de control se eliminan a propósito: pueden romper el
  // renderizado o esconder contenido dentro de un texto aparentemente normal.
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
}
