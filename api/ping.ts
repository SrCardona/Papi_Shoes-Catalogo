/**
 * Diagnóstico temporal. Se borra en cuanto cumpla.
 *
 * A propósito no importa nada arriba: si el módulo se cayera al cargar, Vercel
 * responde 500 sin decir por qué. Cada pieza se importa por separado y adentro
 * de un try, así el que falla se delata solo.
 *
 * No devuelve ningún secreto: la versión de Node y si las variables están o no.
 */
export async function GET(): Promise<Response> {
  const pasos: string[] = [`node=${process.version}`];

  pasos.push(`tieneBlobToken=${Boolean(process.env.BLOB_READ_WRITE_TOKEN)}`);
  pasos.push(`tienePinHash=${Boolean(process.env.ADMIN_PIN_HASH)}`);
  pasos.push(`tieneSecreto=${Boolean(process.env.ADMIN_SESSION_SECRET)}`);

  const intenta = async (nombre: string, cargar: () => Promise<unknown>) => {
    try {
      await cargar();
      pasos.push(`${nombre}=ok`);
    } catch (error) {
      const detalle =
        error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      pasos.push(`${nombre}=FALLA ${detalle}`);
    }
  };

  await intenta('vercelBlob', () => import('@vercel/blob'));
  await intenta('libRespuesta', () => import('./_lib/respuesta.js'));
  await intenta('libSesion', () => import('./_lib/sesion.js'));
  await intenta('libAlmacen', () => import('./_lib/almacen.js'));
  await intenta('libIntentos', () => import('./_lib/intentos.js'));
  await intenta('srcSecurity', () => import('../src/lib/security.js'));
  await intenta('srcValidation', () => import('../src/lib/validation.js'));
  await intenta('libEstado', () => import('./_lib/estado.js'));
  await intenta('rutaSesion', () => import('./sesion.js'));
  await intenta('rutaEstado', () => import('./estado.js'));
  await intenta('rutaImagen', () => import('./imagen.js'));

  return new Response(pasos.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
