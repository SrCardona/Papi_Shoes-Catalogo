import { cx } from '../../lib/utils';

/**
 * Cinta y moño que cruzan la esquina de una puerta, como un regalo.
 *
 * Se apoya en el `overflow-hidden` de quien lo contiene: la cinta sale por el
 * borde de arriba y por el de la derecha, y es el redondeo de la puerta el que
 * la corta limpia.
 */
export function Mono({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 150 150"
      className={cx('pointer-events-none absolute top-0 right-0', className)}
    >
      {/* Cinta en diagonal */}
      <path d="M50 0 H70 L150 80 V100 Z" fill="var(--color-navidad-rojo)" />
      <path d="M50 0 H55 L150 95 V100 Z" fill="#000" opacity="0.18" />

      <g transform="translate(104 46) rotate(45)">
        {/* Colas */}
        <path d="M-2 4 L-16 34 L-9 31 L-6 39 L4 6 Z" fill="#9e0c24" />
        <path d="M2 4 L16 34 L9 31 L6 39 L-4 6 Z" fill="#b30e29" />
        {/* Lazos */}
        <path d="M0 0 C-10 -16 -32 -14 -30 -2 C-28 10 -10 8 0 0 Z" fill="var(--color-navidad-rojo)" />
        <path d="M0 0 C10 -16 32 -14 30 -2 C28 10 10 8 0 0 Z" fill="var(--color-navidad-rojo)" />
        <path d="M0 0 C-8 -10 -22 -10 -24 -3" fill="none" stroke="#000" strokeOpacity="0.2" strokeWidth="2" />
        <path d="M0 0 C8 -10 22 -10 24 -3" fill="none" stroke="#000" strokeOpacity="0.2" strokeWidth="2" />
        {/* Nudo */}
        <ellipse cx="0" cy="0" rx="6" ry="5" fill="#9e0c24" />
      </g>
    </svg>
  );
}
