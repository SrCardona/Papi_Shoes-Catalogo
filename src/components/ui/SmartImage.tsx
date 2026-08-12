import { useState } from 'react';
import { IMAGE_PLACEHOLDER, sanitizeImageUrl } from '../../lib/security';
import { cx } from '../../lib/utils';

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  /** `eager` solo para la imagen principal por encima del pliegue. */
  loading?: 'lazy' | 'eager';
  sizes?: string;
}

/**
 * Imagen con carga diferida y respaldo. La versión anterior usaba <img> a
 * secas: sin lazy loading (todo el catálogo descargaba de golpe) y sin
 * onError (una URL caída dejaba un hueco roto en la cuadrícula).
 */
export function SmartImage({
  src,
  alt,
  className,
  loading = 'lazy',
  sizes,
}: SmartImageProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const safe = failed ? IMAGE_PLACEHOLDER : sanitizeImageUrl(src);

  return (
    <img
      src={safe}
      alt={alt}
      loading={loading}
      decoding="async"
      sizes={sizes}
      onError={() => setFailed(true)}
      onLoad={() => setLoaded(true)}
      className={cx(
        className,
        'transition-opacity duration-700',
        loaded ? 'opacity-100' : 'opacity-0',
      )}
    />
  );
}
