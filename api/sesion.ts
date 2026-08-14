/**
 * Ingreso al panel verificado en el servidor.
 *
 * `GET` dice si el servidor está en condiciones de validar (el navegador lo
 * necesita para saber si pide PIN o si sigue con el control local de siempre) y
 * `POST` recibe el PIN y devuelve el token de escritura.
 *
 * El PIN llega por el cuerpo de una petición https y no se guarda en ninguna
 * parte: se convierte a SHA-256, se compara y se descarta. Tampoco se registra
 * en los logs.
 */
import { almacenDisponible } from './_lib/almacen';
import { limpiaFallos, minutosBloqueado, registraFallo } from './_lib/intentos';
import { json, metodoNoPermitido } from './_lib/respuesta';
import {
  FORMATO_PIN,
  emiteToken,
  huellaDeIp,
  pinConfigurado,
  pinCorrecto,
  secretoConfigurado,
  sesionDisponible,
} from './_lib/sesion';

/** Freno a la fuerza bruta: cada fallo cuesta tiempo de reloj al que insiste. */
const CASTIGO_MS = 400;

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'GET') {
    return json(
      {
        disponible: sesionDisponible,
        nube: almacenDisponible,
        faltaPin: !pinConfigurado,
        faltaSecreto: !secretoConfigurado,
      },
      { cache: 'no-store' },
    );
  }

  if (request.method !== 'POST') return metodoNoPermitido('GET, POST');

  if (!sesionDisponible) {
    return json(
      {
        disponible: false,
        error:
          'El servidor todavía no puede validar el PIN: falta ADMIN_PIN_HASH o ADMIN_SESSION_SECRET en Vercel.',
      },
      { status: 503 },
    );
  }

  const cuerpo = (await request.json().catch(() => null)) as { pin?: unknown } | null;
  const pin = typeof cuerpo?.pin === 'string' ? cuerpo.pin.trim() : '';

  const huella = huellaDeIp(request);
  const bloqueo = await minutosBloqueado(huella);
  if (bloqueo > 0) {
    return json(
      {
        disponible: true,
        bloqueoMinutos: bloqueo,
        error: `Demasiados intentos fallidos. Vuelve a intentar en ${bloqueo} minuto${bloqueo === 1 ? '' : 's'}.`,
      },
      { status: 429 },
    );
  }

  /* Un PIN con formato imposible no cuenta como intento: no aporta información
     al que prueba y evita que un dedo torpe gaste los cinco intentos. */
  if (!FORMATO_PIN.test(pin)) {
    return json(
      { disponible: true, error: 'El PIN debe tener entre 6 y 12 dígitos.' },
      { status: 400 },
    );
  }

  if (!pinCorrecto(pin)) {
    const restantes = await registraFallo(huella);
    await new Promise((listo) => setTimeout(listo, CASTIGO_MS));
    return json(
      {
        disponible: true,
        error:
          restantes > 0
            ? `PIN incorrecto. Te quedan ${restantes} intento${restantes === 1 ? '' : 's'}.`
            : 'Acceso bloqueado por 15 minutos tras varios intentos fallidos.',
      },
      { status: 401 },
    );
  }

  await limpiaFallos(huella);
  const { token, expiraEn } = emiteToken();
  return json({ disponible: true, ok: true, token, expiraEn });
}
