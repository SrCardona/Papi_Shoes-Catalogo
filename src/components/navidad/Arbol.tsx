import { cx } from '../../lib/utils';

/* Bombillos del árbol: posición y color. Se reparten por los tres pisos,
   alternando colores para que dos vecinos nunca se repitan. */
const BOMBILLOS: [number, number, string][] = [
  [92, 62, 'var(--color-navidad-rojo)'],
  [112, 84, 'var(--color-navidad-oro)'],
  [80, 92, 'var(--color-lapis-texto)'],
  [70, 132, 'var(--color-navidad-oro)'],
  [104, 120, 'var(--color-navidad-rojo)'],
  [132, 146, 'var(--color-lapis-texto)'],
  [88, 150, 'var(--color-marble)'],
  [56, 196, 'var(--color-navidad-rojo)'],
  [86, 182, 'var(--color-lapis-texto)'],
  [118, 200, 'var(--color-navidad-oro)'],
  [146, 186, 'var(--color-navidad-rojo)'],
  [100, 212, 'var(--color-marble)'],
];

/**
 * Árbol de Navidad con estrella, bombillos que titilan y regalos al pie.
 *
 * Es decoración del hero y nada más: sin texto, sin clics, por detrás del
 * contenido. El titileo y el brillo de la estrella viven en el CSS
 * (`.arbol .bombillo`, `.arbol .estrella`) para que el movimiento reducido los
 * apague con la misma regla que todo lo demás.
 */
export function Arbol({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 300"
      className={cx('arbol pointer-events-none', className)}
    >
      {/* Tronco */}
      <rect x="90" y="222" width="20" height="26" rx="2" fill="#4a3022" />

      {/* Tres pisos, del de abajo al de arriba: el de arriba tapa la base del
          siguiente, como en un árbol de verdad. */}
      <g strokeLinejoin="round" strokeWidth="8">
        <path d="M100 122 L28 226 H172 Z" fill="#1d6b43" stroke="#1d6b43" />
        <path d="M100 70 L44 160 H156 Z" fill="#22804f" stroke="#22804f" />
        <path d="M100 32 L60 102 H140 Z" fill="#279a5e" stroke="#279a5e" />
      </g>

      {/* Guirnaldas doradas */}
      <g fill="none" stroke="var(--color-navidad-oro)" strokeWidth="1.6" opacity="0.7">
        <path d="M70 88 Q100 104 128 84" />
        <path d="M58 146 Q100 168 146 140" />
        <path d="M42 208 Q100 234 160 200" />
      </g>

      {BOMBILLOS.map(([cx, cy, color], i) => (
        <circle key={i} className="bombillo" cx={cx} cy={cy} r="4.5" fill={color} />
      ))}

      {/* Estrella de cinco puntas en la copa */}
      <path
        className="estrella"
        d="M100 4 L105.3 14.6 L117 16.3 L108.5 24.6 L110.5 36.2 L100 30.7 L89.5 36.2 L91.5 24.6 L83 16.3 L94.7 14.6 Z"
        fill="var(--color-navidad-oro)"
      />

      {/* Regalos al pie. Cinta solo vertical y moño arriba: con la cinta en
          cruz, el rojo con blanco y el azul con dorado se leían como banderas. */}
      {(
        [
          [34, 248, 46, 36, 'var(--color-navidad-rojo)', 'var(--color-marble)'],
          [120, 254, 40, 30, 'var(--color-lapis)', 'var(--color-navidad-oro)'],
          [84, 262, 32, 22, 'var(--color-marble)', 'var(--color-navidad-rojo)'],
        ] as const
      ).map(([x, y, w, h, caja, cinta], i) => {
        const centro = x + w / 2;
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} rx="3" fill={caja} />
            <rect x={centro - 3.5} y={y} width="7" height={h} fill={cinta} />
            <ellipse cx={centro - 6} cy={y - 3} rx="6" ry="3.5" fill={cinta} transform={`rotate(-20 ${centro - 6} ${y - 3})`} />
            <ellipse cx={centro + 6} cy={y - 3} rx="6" ry="3.5" fill={cinta} transform={`rotate(20 ${centro + 6} ${y - 3})`} />
          </g>
        );
      })}
    </svg>
  );
}
