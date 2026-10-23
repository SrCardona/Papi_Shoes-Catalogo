import { cx } from '../../lib/utils';

interface SectionHeaderProps {
  /** Rótulo de la sección: "Originales", "Comunidad", etc. */
  eyebrow: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  className?: string;
  action?: React.ReactNode;
  /** `h1` cuando el encabezado es el título de la página (Preguntas): sin
      eso la página quedaba sin `h1` para lectores de pantalla y buscadores. */
  nivel?: 'h1' | 'h2';
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
  action,
  nivel = 'h2',
}: SectionHeaderProps) {
  const centered = align === 'center';
  const Titulo = nivel;

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
        <Titulo className="font-display text-4xl sm:text-5xl text-marble">{title}</Titulo>
        {description && (
          <p
            className={cx(
              'text-lectura leading-relaxed text-secundario max-w-xl',
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
