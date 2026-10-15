import type { Sneaker } from '../../types';
import { SmartImage } from '../ui/SmartImage';
import { fotoDeVitrina } from '../../lib/vitrina';
import { cx } from '../../lib/utils';

interface TenisFlotanteProps {
  sneaker: Sneaker;
  sizes: string;
  priority?: boolean;
  className?: string;
}

/**
 * El tenis suelto sobre la superficie, sin marco propio.
 *
 * Va entero (`object-contain`) por la misma razón que en la columnata: las
 * fotos de proveedor vienen muy apaisadas y un recorte se come la puntera. El
 * aire alrededor es lo que lo hace "flotar"; no lleva sombra, que la casa no
 * usa sombras difusas.
 */
export function TenisFlotante({
  sneaker,
  sizes,
  priority = false,
  className,
}: TenisFlotanteProps) {
  return (
    <SmartImage
      src={fotoDeVitrina(sneaker)}
      alt={sneaker.name}
      sizes={sizes}
      priority={priority}
      className={cx(
        'w-full h-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.05]',
        sneaker.status === 'agotado' && 'opacity-45',
        className,
      )}
    />
  );
}
