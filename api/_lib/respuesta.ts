/** Respuestas JSON con el mismo formato en las tres funciones. */
export function json(
  datos: unknown,
  opciones: { status?: number; cache?: string; extra?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(datos), {
    status: opciones.status ?? 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': opciones.cache ?? 'no-store',
      ...opciones.extra,
    },
  });
}

export function metodoNoPermitido(permitidos: string): Response {
  return json(
    { error: `Solo se aceptan los métodos ${permitidos}.` },
    { status: 405, extra: { Allow: permitidos } },
  );
}
