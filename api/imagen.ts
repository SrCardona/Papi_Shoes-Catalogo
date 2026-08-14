/**
 * Sube al almacén una foto cargada desde el panel y devuelve su URL.
 *
 * Las fotos que el dueño sube desde el celular o el computador se leían como
 * `data:` dentro del propio documento. Eso servía mientras todo vivía en el
 * navegador, pero un documento con veinte fotos incrustadas no cabe en el cuerpo
 * de una petición, así que cada foto se guarda aparte y en el catálogo queda
 * solo su URL.
 *
 * El nombre es el hash del contenido: subir dos veces la misma foto no ocupa el
 * doble, y como la ruta cambia cuando cambia la foto, se puede cachear por un
 * año sin servir nunca una versión vieja.
 */
import { createHash } from 'node:crypto';
import { almacenDisponible, escribirImagen } from './_lib/almacen.js';
import { json } from './_lib/respuesta.js';
import { sesionDisponible, tokenValido } from './_lib/sesion.js';

const TOPE_BYTES = 4_000_000;

const EXTENSIONES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

/* Un método por exportación, y nunca `export default`: ver la nota en
   `api/estado.ts`. */
export async function POST(request: Request): Promise<Response> {
  if (!almacenDisponible || !sesionDisponible) {
    return json(
      { error: 'La nube no está configurada, así que no se pueden subir fotos.' },
      { status: 503 },
    );
  }
  if (!tokenValido(request.headers.get('authorization'))) {
    return json(
      { error: 'La sesión venció o no es válida. Vuelve a entrar al panel.' },
      { status: 401 },
    );
  }

  /* Solo mapas de bits. El SVG queda fuera a propósito: es un documento que
     puede traer scripts, y servido desde el mismo dominio se ejecutaría. */
  const tipo = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  const extension = EXTENSIONES[tipo];
  if (!extension) {
    return json(
      { error: 'Solo se aceptan imágenes JPG, PNG, WEBP, AVIF o GIF.' },
      { status: 415 },
    );
  }

  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength) {
    return json({ error: 'La petición llegó sin imagen.' }, { status: 400 });
  }
  if (bytes.byteLength > TOPE_BYTES) {
    return json(
      { error: 'La foto pesa más de 4 MB. Redúcela antes de subirla.' },
      { status: 413 },
    );
  }

  const hash = createHash('sha256').update(Buffer.from(bytes)).digest('hex');

  try {
    const url = await escribirImagen(`fotos/${hash}.${extension}`, bytes, tipo);
    return json({ ok: true, url });
  } catch {
    return json(
      { error: 'El almacén rechazó la foto. Intenta de nuevo en un momento.' },
      { status: 502 },
    );
  }
}
