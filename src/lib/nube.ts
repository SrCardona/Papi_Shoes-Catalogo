/**
 * Cliente de la nube: habla con las funciones de `/api`.
 *
 * Lo que el dueño edita en el panel dejó de vivir solo en su navegador. Ahora se
 * publica en un documento único que leen todos los visitantes y cualquier equipo
 * que abra el sitio, así que los cambios sobreviven a apagar el computador, a
 * `npm run dev` y a clonar el repositorio en otra máquina.
 *
 * Siempre se llama por ruta relativa. En el sitio publicado eso pega con las
 * funciones del mismo dominio; en desarrollo, `vite.config.ts` reenvía `/api`
 * al sitio publicado (variable `VITE_API_ORIGIN`), y así el panel local trabaja
 * contra los datos de verdad sin necesidad de CORS ni de la CLI de Vercel.
 *
 * Cuando no hay nube configurada, todas estas funciones lo dicen sin fallar: el
 * sitio sigue andando con el catálogo del código y el `localStorage`, tal como
 * funcionaba antes.
 */
import type { Delivery, Sneaker, StoreSettings } from '../types';

/** Los ajustes tal como viajan: sin usuario ni hash del PIN. */
export type AjustesNube = Partial<
  Omit<StoreSettings, 'adminUsername' | 'adminPinHash'>
>;

export interface EstadoNube {
  version: number;
  actualizadoEn: string;
  huellaCatalogo: string;
  sneakers: Sneaker[];
  deliveries: Delivery[];
  settings: AjustesNube;
}

/** Lo que se manda a guardar. El sello de tiempo lo pone el servidor. */
export type BorradorNube = Omit<EstadoNube, 'version' | 'actualizadoEn'>;

export type LecturaNube =
  /** El sitio no tiene nube conectada: todo sigue como antes. */
  | { tipo: 'sin-nube' }
  /** Hay nube, pero no se pudo consultar (sin conexión, función caída). */
  | { tipo: 'sin-red' }
  /** Nube lista y todavía sin nada publicado. */
  | { tipo: 'vacia' }
  | { tipo: 'estado'; estado: EstadoNube };

export type ResultadoGuardado =
  | { ok: true; actualizadoEn: string }
  | { ok: false; conflicto: boolean; estado?: EstadoNube; mensaje: string };

export type ResultadoSesion =
  | { ok: true; token: string }
  /** `servidor` distingue "el servidor dijo que no" de "no hay servidor". */
  | { ok: false; servidor: boolean; mensaje: string };

const TOKEN_KEY = 'papi_token_nube';

const FALLO_GENERICO = 'No se pudo hablar con la nube. Revisa tu conexión.';

/**
 * Resultado de una llamada a `/api`, con los tres desenlaces que hay que
 * distinguir: no existe la función, no se pudo llegar, o respondió.
 */
type Sondeo<T> =
  /** No hay ninguna función detrás de esta ruta: el sitio no tiene nube. */
  | { tipo: 'sin-api' }
  /** Hay algo, pero no contestó bien: sin conexión o función caída. */
  | { tipo: 'sin-red' }
  | { tipo: 'json'; status: number; datos: T };

/**
 * Envoltura de `fetch` que no supone que al otro lado haya JSON.
 *
 * En desarrollo sin `VITE_API_ORIGIN` no existen las funciones y el servidor de
 * Vite contesta cualquier cosa —un 200 con JavaScript, por ejemplo—, así que un
 * `JSON.parse` reventaría. Se decide por el tipo de contenido; un 5xx sin JSON sí
 * es una falla y no "aquí no hay nube", que es lo que devuelve Vercel cuando una
 * función se cae al arrancar.
 */
async function pide<T>(ruta: string, init?: RequestInit): Promise<Sondeo<T>> {
  try {
    const respuesta = await fetch(ruta, {
      ...init,
      headers: { Accept: 'application/json', ...init?.headers },
    });
    const tipo = respuesta.headers.get('content-type') ?? '';
    if (!tipo.includes('application/json')) {
      return { tipo: respuesta.status >= 500 ? 'sin-red' : 'sin-api' };
    }
    return {
      tipo: 'json',
      status: respuesta.status,
      datos: (await respuesta.json()) as T,
    };
  } catch {
    return { tipo: 'sin-red' };
  }
}

/* ── Token de escritura ───────────────────────────────────────────────────
   Vive en `sessionStorage`: se va al cerrar la pestaña y no lo hereda otra.
   Es lo único que el navegador guarda del ingreso; el PIN no se guarda.    */

interface TokenGuardado {
  token: string;
  expiraEn: number;
}

export function guardaToken(token: string, expiraEn: number): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token, expiraEn }));
  } catch {
    /* almacenamiento bloqueado: la sesión durará solo esta carga de página */
  }
}

export function leeToken(): string | null {
  try {
    const crudo = sessionStorage.getItem(TOKEN_KEY);
    if (!crudo) return null;
    const guardado = JSON.parse(crudo) as TokenGuardado;
    if (!guardado.token || guardado.expiraEn <= Date.now()) return null;
    return guardado.token;
  } catch {
    return null;
  }
}

export function borraToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* almacenamiento bloqueado */
  }
}

/* ── Sesión ─────────────────────────────────────────────────────────────── */

/** ¿El servidor está en condiciones de validar el PIN y de guardar? */
export async function consultaPanel(): Promise<{
  validaEnServidor: boolean;
  nube: boolean;
} | null> {
  const r = await pide<{ disponible?: boolean; nube?: boolean }>('/api/sesion');
  if (r.tipo !== 'json') return null;
  return {
    validaEnServidor: Boolean(r.datos.disponible),
    nube: Boolean(r.datos.nube),
  };
}

export async function abrirSesion(pin: string): Promise<ResultadoSesion> {
  const r = await pide<{
    ok?: boolean;
    token?: string;
    expiraEn?: number;
    disponible?: boolean;
    error?: string;
  }>('/api/sesion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });

  if (r.tipo !== 'json') return { ok: false, servidor: false, mensaje: FALLO_GENERICO };

  if (r.status === 200 && r.datos.ok && r.datos.token) {
    guardaToken(r.datos.token, r.datos.expiraEn ?? Date.now() + 2 * 60 * 60 * 1000);
    return { ok: true, token: r.datos.token };
  }

  return {
    ok: false,
    // Un 503 significa que el servidor existe pero no está configurado para
    // validar; ahí el panel debe caer al control local en vez de negar el paso.
    servidor: r.datos.disponible !== false,
    mensaje: r.datos.error ?? 'No se pudo iniciar sesión.',
  };
}

/* ── Documento publicado ────────────────────────────────────────────────── */

export async function leerEstado(fresco: boolean): Promise<LecturaNube> {
  const r = await pide<{ nube?: boolean; estado?: EstadoNube | null }>(
    fresco ? '/api/estado?fresco=1' : '/api/estado',
  );
  if (r.tipo === 'sin-api') return { tipo: 'sin-nube' };
  if (r.tipo === 'sin-red' || r.status !== 200) return { tipo: 'sin-red' };
  if (!r.datos.nube) return { tipo: 'sin-nube' };
  if (!r.datos.estado) return { tipo: 'vacia' };
  return { tipo: 'estado', estado: r.datos.estado };
}

export async function guardarEstado(
  borrador: BorradorNube,
  base: string,
  token: string,
): Promise<ResultadoGuardado> {
  const r = await pide<{
    ok?: boolean;
    actualizadoEn?: string;
    conflicto?: boolean;
    estado?: EstadoNube;
    error?: string;
  }>('/api/estado', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ base, estado: borrador }),
  });

  if (r.tipo !== 'json') return { ok: false, conflicto: false, mensaje: FALLO_GENERICO };
  if (r.status === 200 && r.datos.actualizadoEn) {
    return { ok: true, actualizadoEn: r.datos.actualizadoEn };
  }
  return {
    ok: false,
    conflicto: r.status === 409,
    estado: r.datos.estado,
    mensaje: r.datos.error ?? 'La nube rechazó el guardado.',
  };
}

/* ── Fotos ──────────────────────────────────────────────────────────────── */

/**
 * Una foto subida desde el dispositivo, que hoy queda incrustada como `data:`.
 * El marcador de "sin imagen" es un SVG y se deja quieto: no es una foto.
 */
function esFotoIncrustada(url: string): boolean {
  return url.startsWith('data:image/') && !url.startsWith('data:image/svg');
}

async function subeFoto(dataUrl: string, token: string): Promise<string> {
  // `fetch` sobre un `data:` es la forma corta de volverlo binario. Se sube en
  // binario y no en base64 para no inflar un tercio el peso de cada foto.
  const binario = await (await fetch(dataUrl)).blob();
  const r = await pide<{ url?: string; error?: string }>('/api/imagen', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': binario.type || 'image/jpeg',
    },
    body: binario,
  });
  if (r.tipo !== 'json' || r.status !== 200 || !r.datos.url) {
    const detalle = r.tipo === 'json' ? r.datos.error : null;
    throw new Error(detalle ?? 'No se pudo subir una foto al almacén.');
  }
  return r.datos.url;
}

/**
 * Reemplaza por URL todas las fotos incrustadas del borrador.
 *
 * Es lo que permite que el documento quepa: veinte entregas con la foto dentro
 * pesan varios megas, y el cuerpo de una petición no llega a tanto. Cada foto se
 * sube una sola vez aunque aparezca repetida.
 */
export async function subirFotos(
  borrador: BorradorNube,
  token: string,
): Promise<{ borrador: BorradorNube; subidas: number }> {
  const subidas = new Map<string, string>();

  /* De una en una a propósito: soltar cincuenta subidas a la vez contra la
     misma función solo consigue que algunas se caigan por tiempo de espera. */
  const resolver = async (url: string): Promise<string> => {
    if (!esFotoIncrustada(url)) return url;
    const conocida = subidas.get(url);
    if (conocida) return conocida;
    const nueva = await subeFoto(url, token);
    subidas.set(url, nueva);
    return nueva;
  };

  const sneakers: Sneaker[] = [];
  for (const par of borrador.sneakers) {
    const images: string[] = [];
    let cambio = false;
    for (const foto of par.images) {
      const resuelta = await resolver(foto);
      cambio = cambio || resuelta !== foto;
      images.push(resuelta);
    }
    sneakers.push(cambio ? { ...par, images } : par);
  }

  const deliveries: Delivery[] = [];
  for (const entrega of borrador.deliveries) {
    const image = await resolver(entrega.image);
    deliveries.push(image === entrega.image ? entrega : { ...entrega, image });
  }

  const settings: AjustesNube = { ...borrador.settings };
  for (const clave of ['shippingSlides', 'promoSlides', 'reviewSlides'] as const) {
    const historias = settings[clave];
    if (!historias?.length) continue;
    const resueltas = [];
    for (const slide of historias) {
      const image = await resolver(slide.image);
      resueltas.push(image === slide.image ? slide : { ...slide, image });
    }
    settings[clave] = resueltas;
  }

  return {
    borrador: { ...borrador, sneakers, deliveries, settings },
    subidas: subidas.size,
  };
}
