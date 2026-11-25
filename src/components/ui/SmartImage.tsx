import { useEffect, useRef, useState } from 'react';
import { IMAGE_PLACEHOLDER, sanitizeImageUrl } from '../../lib/security';
import { cx } from '../../lib/utils';

/**
 * Anchos de las copias livianas de `public/livianas/`. Tienen que ser los
 * mismos de `ANCHOS` en `scripts/fotos-livianas.py`, que es el que las hace:
 * pedir un ancho que no se generó es pedir un archivo que no existe.
 */
const ANCHOS_LIVIANAS = [384, 800] as const;

/**
 * Las fotos del catálogo se sirven encogidas y en WebP.
 *
 * Los archivos de `public/catalogo/` son de proveedor: 141 KB de promedio y
 * hasta 646 KB, para una tarjeta que en un teléfono mide 175 px.
 * `scripts/fotos-livianas.py` hace dos copias de cada una (384 y 800 px, unos
 * 16 y 44 KB) y el navegador escoge con `sizes`. Antes las encogía el
 * optimizador de Vercel al vuelo, pero tiene cuota mensual: al agotarse (402)
 * todo el sitio caía a los archivos enteros.
 *
 * Solo las fotos de `/catalogo/` tienen copia. Las del panel viven en el
 * almacén, con otro dominio, y las de entregas y recortes ya vienen livianas:
 * esas pasan tal cual.
 */
function liviana(url: string, ancho: number): string | null {
  if (!url.startsWith('/catalogo/')) return null;
  const sinExtension = url.slice('/catalogo/'.length).replace(/\.[a-z0-9]+$/i, '');
  return `/livianas/${sinExtension}-${ancho}.webp`;
}

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  /**
   * La foto que decide el LCP: entra sin diferir, con prioridad alta y sin el
   * fundido de entrada. Para lo que se ve al llegar, nada más.
   */
  priority?: boolean;
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
  priority = false,
  sizes,
}: SmartImageProps) {
  /* Dos tropiezos posibles, en orden: si falta la copia liviana (una foto
     recién cargada a la que no se le corrió el script) se pide el original; solo
     si también cae el original se pone el respaldo. */
  /* Los tropiezos se anotan con la foto a la que le pasaron: la galería de la
     ficha cambia `src` sin desmontar, y la foto siguiente no tiene por qué
     heredar el fallo de la anterior. */
  const [sinLivianaEn, setSinLivianaEn] = useState<string | null>(null);
  const [fallidaEn, setFallidaEn] = useState<string | null>(null);
  const sinLiviana = sinLivianaEn === src;
  const failed = fallidaEn === src;
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  const safe = failed ? IMAGE_PLACEHOLDER : sanitizeImageUrl(src);

  const conLiviana = !failed && !sinLiviana && liviana(safe, ANCHOS_LIVIANAS[0]) !== null;
  const srcSet = conLiviana
    ? ANCHOS_LIVIANAS.map((a) => `${liviana(safe, a)} ${a}w`).join(', ')
    : undefined;
  const actual = conLiviana ? (liviana(safe, 800) as string) : safe;

  const alFallar = () => {
    if (conLiviana) setSinLivianaEn(src);
    else setFallidaEn(src);
  };

  /* Una foto que ya estaba en la caché, o un error que llega en un instante,
     puede terminar antes de que React escuche `load` o `error` en la etiqueta.
     Entonces el evento no llega nunca: la tarjeta se quedaba en opacidad cero
     —un cuadro negro—. Al montar y al cambiar de dirección se mira cómo quedó
     la etiqueta y se actúa igual que si el evento hubiera llegado. */
  useEffect(() => {
    const img = ref.current;
    if (!img || !img.complete) return;
    if (img.naturalWidth > 0) {
      setLoaded(true);
    } else if (img.currentSrc) {
      /* Solo con `currentSrc`: una foto diferida que todavía no se pidió no
         tiene, y en algunos Safari ya dice `complete`. Sin esa guarda, las
         tarjetas de más abajo se darían por rotas antes de cargar. */
      alFallar();
    }
    // alFallar cambia en cada render; lo que importa es la dirección pedida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actual]);

  /* El fundido tapa el salto de la carga diferida, pero sobre la foto de
     arriba del pliegue se paga caro: el navegador no cuenta como pintado lo
     que está en opacidad cero, así que el fundido se le suma al LCP. */
  const conFundido = !priority;

  return (
    <img
      ref={ref}
      src={actual}
      srcSet={srcSet}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding={priority ? 'sync' : 'async'}
      sizes={sizes}
      onError={alFallar}
      onLoad={() => setLoaded(true)}
      /* Para que la celda deje de mostrar "cargando" (`.foto-cargando`). */
      data-cargada={loaded || undefined}
      className={cx(
        className,
        conFundido && 'transition-opacity duration-700',
        conFundido && !loaded ? 'opacity-0' : 'opacity-100',
      )}
    />
  );
}
