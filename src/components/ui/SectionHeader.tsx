import { cx } from '../../lib/utils';

interface SectionHeaderProps {
  /** Rótulo de la sección: "Originales", "Comunidad", etc. */
  eyebrow: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  className?: string;
  action?: React.ReactNode;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
  action,
}: SectionHeaderProps) {
  const centered = align === 'center';

  /* Centrado y fila son excluyentes. Antes convivían las dos, y que el centrado
     funcionara dependía de que `md:flex-col` le ganara a `md:flex-row` por el
     orden en que Tailwind emite ese grupo de utilidades. Además solo arrancaba
     en `md`, así que en celular el texto quedaba centrado dentro de un bloque
     pegado a la izquierda. */
  return (
    <div
      className={cx(
        'flex flex-col gap-5',
        centered
          ? 'items-center text-center'
          : 'md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className={cx('space-y-3', centered && 'max-w-2xl mx-auto')}>
        <div className={cx('flex items-center gap-3', centered && 'justify-center')}>
          <span className="h-px w-8 bg-silver/45" />
          <span className="eyebrow">{eyebrow}</span>
        </div>
        <h2 className="font-display text-4xl sm:text-5xl text-marble">{title}</h2>
        {description && (
          <p
            className={cx(
              'text-[13px] leading-relaxed text-marble/45 max-w-xl',
              centered && 'mx-auto',
            )}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
