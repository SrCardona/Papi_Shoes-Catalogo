/**
 * Almacén de la nube (Vercel Blob).
 *
 * Es el único lugar donde vive lo que el dueño edita en el panel. Antes todo
 * quedaba en el `localStorage` del navegador que hizo el cambio, así que no
 * cruzaba a otro equipo ni lo veían los visitantes.
 *
 * Las carpetas y archivos que empiezan por `_` no se convierten en rutas: esto
 * es una biblioteca, no un endpoint.
 */
import { BlobNotFoundError, get, put } from '@vercel/blob';

/** Vercel inyecta esta variable al conectar un Blob Store al proyecto. */
export const almacenDisponible = Boolean(
  (process.env.BLOB_READ_WRITE_TOKEN ?? '').trim(),
);

/**
 * "No hay nada" y "no se pudo leer" son cosas distintas y hay que distinguirlas:
 * si un fallo de lectura pasara por documento vacío, el siguiente guardado
 * pisaría el catálogo bueno creyendo que no había nada.
 */
export type Lectura<T> =
  | { estado: 'vacio' }
  | { estado: 'ok'; valor: T }
  | { estado: 'error' };

export async function leerJson<T>(ruta: string): Promise<Lectura<T>> {
  if (!almacenDisponible) return { estado: 'vacio' };
  try {
    /* `useCache: false` va a propósito: el panel lee para escribir encima, y una
       copia cacheada de hace un minuto le costaría los cambios que otro
       dispositivo acabó de publicar. El caché de cara al visitante lo pone la
       función que sirve el dato, que es donde se puede controlar. */
    const resultado = await get(ruta, { access: 'public', useCache: false });
    if (!resultado) return { estado: 'vacio' };
    if (resultado.statusCode !== 200) return { estado: 'error' };

    const texto = await new Response(resultado.stream).text();
    return { estado: 'ok', valor: JSON.parse(texto) as T };
  } catch (error) {
    // Que el archivo no exista todavía es normal: es el primer arranque.
    if (error instanceof BlobNotFoundError) return { estado: 'vacio' };
    return { estado: 'error' };
  }
}

export async function escribirJson(ruta: string, valor: unknown): Promise<void> {
  await put(ruta, JSON.stringify(valor), {
    access: 'public',
    contentType: 'application/json; charset=utf-8',
    // Sin sufijo aleatorio la ruta es estable, y así se puede sobrescribir.
    addRandomSuffix: false,
    allowOverwrite: true,
    // Un minuto es el mínimo que acepta el almacén. Da igual para nosotros: se
    // lee siempre con `useCache: false`.
    cacheControlMaxAge: 60,
  });
}

/** Sube bytes de imagen y devuelve su URL pública definitiva. */
export async function escribirImagen(
  ruta: string,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<string> {
  const subida = await put(ruta, Buffer.from(bytes), {
    access: 'public',
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
    // El nombre es el hash del contenido: si cambia la foto, cambia la ruta.
    // Por eso se puede cachear un año sin miedo a servir la anterior.
    cacheControlMaxAge: 31536000,
  });
  return subida.url;
}
