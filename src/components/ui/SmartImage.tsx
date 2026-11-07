import { useEffect, useRef, useState } from 'react';
import { IMAGE_PLACEHOLDER, sanitizeImageUrl } from '../../lib/security';
import { cx } from '../../lib/utils';

/**
 * Anchos que el optimizador de Vercel tiene permitido servir.
 *
 * Tiene que ser el mismo conjunto que `images.sizes` en `vercel.json`: pedir un
 * ancho que no esté en esa lista devuelve 400 y la foto no se ve. Si se toca
 * uno, se tocan los dos.
 */
const ANCHOS = [256, 384, 512, 768, 1024, 1536] as const;

/** Calidad de recompresión. 75 es el punto donde la gamuza todavía se lee. */
const CALIDAD = 75;

/**
 * Las fotos del catálogo se sirven redimensionadas y en formato moderno.
 *
 * Los archivos de `public/catalogo/` son de proveedor: 156 KB de promedio y
 * hasta 646 KB, para una tarjeta que en un teléfono mide 175 px. Vercel las
 * encoge y las convierte a AVIF o WebP al vuelo según lo que acepte el
 * navegador, así que no hay copias que versionar ni originales que tocar.
 *
 * Solo se optimiza lo que sirve este mismo sitio. Una foto que el dueño subió
 * desde el panel vive en el almacén con otro dominio y pasa tal cual: para
 * optimizarla habría que declarar ese dominio, y una lista mal escrita deja sin
 * foto justo a los pares que él mismo cargó.
 */
function esLocal(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//');
}

function urlOptimizada(url: string, ancho: number): string {
  return `/_vercel/image?url=${encodeURIComponent(url)}&w=${ancho}&q=${CALIDAD}`;
}

/* Si el optimizador falla una vez, falla para todas: un 402 es la cuota del
   mes agotada, no una foto mala. Desde ese momento las fotos que se monten van
   directo al archivo, en vez de pedir cada una dos veces —primero la que falla
   y después la buena— por 1.300 tarjetas. Vive en el módulo y no en un estado:
   dura lo que dura la pestaña y la siguiente carga vuelve a probar.

   Las tarjetas ya montadas también se enteran (`avisarCaida`): el catálogo
   monta todas al cargar, y las de más abajo todavía no han pedido su foto
   diferida, así que cambian de dirección antes de pedirla. */
let optimizadorCaido = false;
const alCaer = new Set<() => void>();

function avisarCaida() {
  if (optimizadorCaido) return;
  optimizadorCaido = true;
  alCaer.forEach((avisar) => avisar());
  alCaer.clear();
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
  /* Dos tropiezos posibles, en orden: primero cae el optimizador y se pide el
     archivo tal cual; solo si también cae el archivo se pone el respaldo. Sin
     el paso intermedio, un 402 del optimizador por cuota agotada dejaba el
     catálogo entero sin una sola foto, aunque los archivos estaban ahí. */
  const [sinOptimizar, setSinOptimizar] = useState(() => optimizadorCaido);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  const safe = failed ? IMAGE_PLACEHOLDER : sanitizeImageUrl(src);

  /* En desarrollo no existe el optimizador —es un servicio de Vercel, no de
     Vite—, así que ahí se sirve el archivo tal cual. Es la misma foto, solo que
     sin encoger. */
  const optimizable =
    !import.meta.env.DEV && !failed && !sinOptimizar && esLocal(safe);
  const srcSet = optimizable
    ? ANCHOS.map((a) => `${urlOptimizada(safe, a)} ${a}w`).join(', ')
    : undefined;
  const actual = optimizable ? urlOptimizada(safe, 1024) : safe;

  const alFallar = () => {
    if (optimizable) {
      setSinOptimizar(true);
      avisarCaida();
    } else {
      setFailed(true);
    }
  };

  useEffect(() => {
    if (sinOptimizar) return;
    const avisar = () => setSinOptimizar(true);
    alCaer.add(avisar);
    return () => {
      alCaer.delete(avisar);
    };
  }, [sinOptimizar]);

  /* Una foto que ya estaba en la caché, o un error que llega en un instante,
     puede terminar antes de que React escuche `load` o `error` en la etiqueta.
     Entonces el evento no llega nunca: la tarjeta se quedaba en opacidad cero
     —un cuadro negro— o pegada a la dirección del optimizador caído. Al montar
     y al cambiar de dirección se mira cómo quedó la etiqueta y se actúa igual
     que si el evento hubiera llegado. */
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
