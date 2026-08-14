/**
 * El catálogo publicado: `GET` para leerlo, `PUT` para reemplazarlo.
 *
 * Leer es público —es lo que ve cualquier visitante— y escribir exige el token
 * que entrega `/api/sesion`. La escritura es optimista: el panel manda el sello
 * de tiempo del documento que tenía cuando empezó a editar y, si en la nube ya
 * hay uno más nuevo, se responde 409 en vez de pisar el trabajo del otro
 * dispositivo.
 */
import { almacenDisponible, escribirJson, leerJson } from './_lib/almacen';
import {
  RUTA_ESTADO,
  TOPE_BYTES,
  saneaEstado,
  type EstadoPublicado,
} from './_lib/estado';
import { json } from './_lib/respuesta';
import { sesionDisponible, tokenValido } from './_lib/sesion';

/* Un método por exportación, y nunca `export default`: Vercel interpreta el
   handler por defecto como la firma antigua `(request, response)`, ignora la
   `Response` que uno devuelve y la función se cae sin contestar. Con los métodos
   por nombre, además, el propio runtime responde 405 a lo que no está acá. */
export function GET(request: Request): Promise<Response> {
  return leer(request);
}

export function PUT(request: Request): Promise<Response> {
  return guardar(request);
}

async function leer(request: Request): Promise<Response> {
  /* Sin almacén conectado el sitio no está roto: funciona con el catálogo del
     código, como siempre. El navegador necesita distinguir ese caso de "la nube
     está pero todavía no hay nada publicado". */
  if (!almacenDisponible) return json({ nube: false });

  const lectura = await leerJson<EstadoPublicado>(RUTA_ESTADO);
  if (lectura.estado === 'error') {
    /* Mejor decir "no pude leer" que "no hay nada": lo segundo haría que el
       navegador diera por perdido el catálogo publicado. */
    return json(
      { nube: true, error: 'El almacén no respondió.' },
      { status: 502 },
    );
  }

  /* El panel pide `?fresco=1` porque lee para después escribir encima, y ahí una
     copia cacheada le costaría cambios. Al visitante le sirve la de la CDN, que
     además evita despertar esta función en cada visita.

     Quince segundos es el trato entre "en vivo" y no invocar la función en cada
     carga: un cambio publicado desde el panel se ve en el resto de dispositivos
     dentro de ese margen, y la CDN absorbe las visitas de por medio. */
  const fresco = new URL(request.url).searchParams.has('fresco');
  return json(
    { nube: true, estado: lectura.estado === 'ok' ? lectura.valor : null },
    {
      cache: fresco
        ? 'no-store'
        : 'public, max-age=0, s-maxage=15, stale-while-revalidate=45',
    },
  );
}

async function guardar(request: Request): Promise<Response> {
  if (!almacenDisponible) {
    return json(
      {
        error:
          'La nube no está configurada: falta conectar un Blob Store al proyecto en Vercel.',
      },
      { status: 503 },
    );
  }
  if (!sesionDisponible) {
    return json(
      {
        error:
          'Falta configurar ADMIN_PIN_HASH y ADMIN_SESSION_SECRET en Vercel para poder guardar.',
      },
      { status: 503 },
    );
  }
  if (!tokenValido(request.headers.get('authorization'))) {
    return json(
      { error: 'La sesión venció o no es válida. Vuelve a entrar al panel.' },
      { status: 401 },
    );
  }

  const anunciado = Number(request.headers.get('content-length') ?? 0);
  if (anunciado > TOPE_BYTES) return demasiadoGrande();

  const cuerpo = (await request.json().catch(() => null)) as {
    base?: unknown;
    estado?: unknown;
  } | null;
  if (!cuerpo || typeof cuerpo !== 'object') {
    return json({ error: 'El cuerpo de la petición no es un JSON válido.' }, { status: 400 });
  }

  const lectura = await leerJson<EstadoPublicado>(RUTA_ESTADO);
  if (lectura.estado === 'error') {
    /* Sin poder leer lo que hay, guardar sería a ciegas: podría estar pisando el
       trabajo de otro dispositivo sin manera de saberlo. */
    return json(
      {
        error:
          'No se pudo leer lo que hay publicado, así que no se guarda nada. Intenta de nuevo en un momento.',
      },
      { status: 503 },
    );
  }

  const actual = lectura.estado === 'ok' ? lectura.valor : null;
  const base = typeof cuerpo.base === 'string' ? cuerpo.base : '';
  if (actual && actual.actualizadoEn !== base) {
    return json(
      {
        error:
          'En la nube hay cambios más nuevos que los de este dispositivo. Trae la versión de la nube antes de volver a guardar.',
        conflicto: true,
        estado: actual,
      },
      { status: 409 },
    );
  }

  /* El sello tiene que avanzar siempre: es lo que sostiene el control de
     conflictos, y el reloj de dos instancias distintas puede ir corrido. */
  let ahora = new Date().toISOString();
  if (actual && ahora <= actual.actualizadoEn) {
    ahora = new Date(new Date(actual.actualizadoEn).getTime() + 1).toISOString();
  }

  const estado = saneaEstado(cuerpo.estado, ahora);
  if (!estado.sneakers.length) {
    return json(
      { error: 'El documento no trae ningún par válido, así que no se guarda.' },
      { status: 400 },
    );
  }

  const serializado = JSON.stringify(estado);
  if (serializado.length > TOPE_BYTES) return demasiadoGrande();

  try {
    await escribirJson(RUTA_ESTADO, estado);
  } catch {
    return json(
      { error: 'El almacén rechazó la escritura. Intenta de nuevo en un momento.' },
      { status: 502 },
    );
  }

  return json({ ok: true, actualizadoEn: estado.actualizadoEn });
}

function demasiadoGrande(): Response {
  return json(
    {
      error:
        'El catálogo pesa demasiado para guardarse de una vez. Quita entregas antiguas o usa fotos por URL en vez de subirlas desde el dispositivo.',
    },
    { status: 413 },
  );
}
