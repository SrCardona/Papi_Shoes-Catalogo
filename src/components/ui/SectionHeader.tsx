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

  return (
    <div
      className={cx(
        'flex flex-col gap-5 md:flex-row md:items-end md:justify-between',
        centered && 'md:flex-col md:items-center text-center',
        className,
      )}
    >
      <div className={cx('space-y-3', centered && 'max-w-2xl')}>
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
