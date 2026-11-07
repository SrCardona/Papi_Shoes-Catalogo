import { cx } from '../../lib/utils';

/**
 * Gorro de Papá Noel para el emblema del templo.
 *
 * Va aparte de `TempleMark` y no dentro: el emblema se usa también en la
 * pantalla de error, en el panel y en las historias, y ahí no lleva gorro.
 * Quien lo quiera lo monta encima, con su propia posición.
 */
export function Gorro({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 42 32"
      className={cx('pointer-events-none absolute', className)}
    >
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
    </svg>
  );
}
