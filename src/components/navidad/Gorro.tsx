/**
 * Gorro de Papá Noel, como grupo de SVG para montarlo dentro del emblema.
 *
 * Va dentro del `<svg>` de `TempleMark` y no encima como capa aparte: así
 * escala y se atenúa junto con el emblema donde sea que aparezca —la barra, el
 * pie, la página de error, el 404—, sin que cada sitio tenga que calcular su
 * posición. Dibujado en su propia caja de 42 × 32; `TempleMark` lo coloca
 * sobre el frontón.
 */
export function FormaGorro({ transform }: { transform: string }) {
  return (
    <g transform={transform} aria-hidden>
      {/* Cuerpo: sube desde el ribete y cae doblado hacia la derecha. */}
      <path
        d="M6 24 C8 12 15 4 25 4 C32 4 36.5 8 38 14.5 L34 15.5 C32.5 12 30 10.5 26.5 11 C30.5 15 31.5 20 31.5 24 Z"
        fill="var(--color-navidad-rojo)"
      />
      {/* Sombra del pliegue, para que no sea una mancha plana. */}
      <path
        d="M26.5 11 C30.5 15 31.5 20 31.5 24 L26 24 C26.5 19 26 15 24 11.5 Z"
        fill="#000"
        opacity="0.22"
      />
      {/* Ribete y pompón, en el blanco mármol de la casa. */}
      <rect x="3" y="21.5" width="31.5" height="7.5" rx="3.75" fill="var(--color-marble)" />
      <circle cx="37" cy="16.5" r="4.2" fill="var(--color-marble)" />
    </g>
  );
}
