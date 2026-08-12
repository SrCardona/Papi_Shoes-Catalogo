import { useId } from 'react';
import { useStore } from '../../context/StoreContext';
import { cx } from '../../lib/utils';

interface TempleMarkProps {
  className?: string;
  /** `silver` reproduce el metálico del manual; `line` es el trazo de las historias. */
  variant?: 'silver' | 'line';
  title?: string;
}

/**
 * El emblema de la tienda: frontón, cinco columnas y estilóbato.
 * Se usa como SVG y no como imagen para que sea nítido a cualquier tamaño
 * y pueda heredar el color en los contextos monocromos.
 *
 * A propósito no lee `settings`: `ErrorBoundary` envuelve a `StoreProvider` y
 * dibuja este emblema en su pantalla de error. Si aquí se llamara a `useStore`,
 * un error controlado se convertiría en una caída seca. Quien represente a la
 * marca pasa el nombre por `title`.
 */
export function TempleMark({
  className,
  variant = 'silver',
  title = 'Emblema del templo',
}: TempleMarkProps) {
  const id = useId();
  const gradientId = `temple-metal-${id}`;
  const isLine = variant === 'line';

  return (
    <svg
      viewBox="0 0 64 52"
      className={cx('shrink-0', className)}
      role="img"
      aria-label={title}
      fill="none"
    >
      {!isLine && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#dcdcdc" />
            <stop offset="52%" stopColor="#8a8a8a" />
            <stop offset="64%" stopColor="#c8c8c8" />
            <stop offset="100%" stopColor="#f4f4f4" />
          </linearGradient>
        </defs>
      )}

      {(() => {
        const paint = isLine
          ? { stroke: 'currentColor', strokeWidth: 2, fill: 'none' as const }
          : { fill: `url(#${gradientId})` };

        return (
          <g {...paint} strokeLinejoin="round">
            {/* Frontón */}
            <path d="M32 3 L61 17 H3 Z" />
            {/* Arquitrabe */}
            <rect x="6" y="20" width="52" height="4" />
            {/* Columnata: cinco fustes */}
            <rect x="10" y="26" width="6" height="16" />
            <rect x="21" y="26" width="6" height="16" />
            <rect x="29" y="26" width="6" height="16" />
            <rect x="37" y="26" width="6" height="16" />
            <rect x="48" y="26" width="6" height="16" />
            {/* Estilóbato */}
            <rect x="3" y="44" width="58" height="5" />
          </g>
        );
      })()}
    </svg>
  );
}

/** Logotipo completo: emblema + palabra marca + bajada. */
export function BrandLockup({
  size = 'md',
  className,
  showTagline = true,
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
}) {
  const { settings } = useStore();
  const scale = {
    sm: { mark: 'w-7 h-7', word: 'text-xl', tag: 'text-[7px] tracking-[0.3em]' },
    md: { mark: 'w-10 h-10', word: 'text-3xl', tag: 'text-[8px] tracking-[0.34em]' },
    lg: { mark: 'w-16 h-16', word: 'text-5xl', tag: 'text-[10px] tracking-[0.4em]' },
    xl: {
      mark: 'w-24 h-24 sm:w-32 sm:h-32',
      word: 'text-6xl sm:text-8xl',
      tag: 'text-[10px] sm:text-xs tracking-[0.45em]',
    },
  }[size];

  return (
    <div className={cx('flex flex-col items-center', className)}>
      <TempleMark className={scale.mark} title={settings.storeName} />
      <span
        className={cx('font-display text-engraved leading-none mt-2', scale.word)}
      >
        {settings.storeName}
      </span>
      {showTagline && settings.tagline && (
        <span className={cx('mt-2 font-semibold uppercase text-silver/70', scale.tag)}>
          {settings.tagline}
        </span>
      )}
    </div>
  );
}
