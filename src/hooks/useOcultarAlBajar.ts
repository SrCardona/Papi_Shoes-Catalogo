import { useEffect, useRef, useState } from 'react';

/**
 * Movimiento mínimo antes de reaccionar. Sin este margen, el temblor del dedo
 * en un teléfono o el rebote de un trackpad hacen parpadear la barra.
 */
export const UMBRAL_MOVIMIENTO = 10;

/**
 * Cuánto hay que haber bajado antes de que la barra se pueda esconder.
 *
 * Esconderla apenas arranca el scroll se siente nerviosa: el visitante todavía
 * está leyendo el encabezado y ya se le movió algo. Con este margen, el primer
 * empujón no la toca.
 */
export const MINIMO_PARA_ESCONDER = 150;

export interface DecisionScroll {
  oculta: boolean;
  /** El punto contra el que se medirá el siguiente movimiento. */
  referencia: number;
}

/**
 * La regla entera, sin React ni `window` de por medio.
 *
 * Está separada porque es lo único que de verdad define el comportamiento, y
 * así se puede comprobar con números en vez de a ojo en un navegador: los tres
 * casos —tope, ruido, movimiento real— son fáciles de equivocar y difíciles de
 * ver con el dedo.
 */
export function decidirOculta(
  y: number,
  referencia: number,
  ocultaAhora: boolean,
): DecisionScroll {
  /* Cerca del tope siempre se ve, sin mirar el umbral: ahí la barra está en su
     sitio normal y esconderla no recupera pantalla, solo desconcierta. */
  if (y <= MINIMO_PARA_ESCONDER) return { oculta: false, referencia: y };

  const avance = y - referencia;

  /* Por debajo del umbral no se mueve la referencia: así los movimientos
     pequeños se van sumando hasta pasar los 10 px, en vez de perderse uno a uno
     y dejar la barra sorda a un scroll lento. */
  if (Math.abs(avance) < UMBRAL_MOVIMIENTO) {
    return { oculta: ocultaAhora, referencia };
  }

  return { oculta: avance > 0, referencia: y };
}

/**
 * Si una barra pegada arriba debería estar escondida ahora mismo.
 *
 * Se esconde al bajar y vuelve apenas se sube, aunque sea poco: así el catálogo
 * se explora sin estorbos pero los filtros quedan a un gesto, sin tener que
 * volver hasta el tope de la página.
 *
 * `bloqueada` la deja quieta y visible. Es para cuando hay algo abierto o con el
 * foco dentro de la barra: esconderla en ese momento se llevaría de la pantalla
 * justo lo que el visitante está usando, y en el caso del campo de búsqueda
 * dejaría el foco en un elemento que ya no se ve.
 */
export function useOcultarAlBajar(bloqueada = false): boolean {
  const [oculta, setOculta] = useState(false);
  const referencia = useRef(0);
  /* Espejo de `oculta` para leerlo dentro del manejador sin volver a suscribir
     el listener en cada cambio, y sobre todo sin decidir dentro del updater de
     `setOculta`: React lo invoca dos veces en StrictMode y la segunda pasada
     mediría contra una referencia que la primera ya movió. */
  const ocultaRef = useRef(false);

  useEffect(() => {
    /* Bloqueada no se escucha el scroll: la barra no se mueve pase lo que pase,
       así que medir sería trabajo perdido en cada rueda del ratón. */
    if (bloqueada) return;

    /* Se parte del scroll actual y no del último que se vio: mientras estuvo
       bloqueada la página pudo moverse, y comparar contra un valor viejo daría
       un salto grande que escondería la barra sin que nadie la haya empujado. */
    referencia.current = window.scrollY;

    const alHacerScroll = () => {
      const decision = decidirOculta(
        window.scrollY,
        referencia.current,
        ocultaRef.current,
      );
      referencia.current = decision.referencia;
      /* Solo se avisa a React cuando de verdad cambia: el scroll dispara
         decenas de eventos por gesto y casi todos no mueven nada. */
      if (decision.oculta === ocultaRef.current) return;
      ocultaRef.current = decision.oculta;
      setOculta(decision.oculta);
    };

    window.addEventListener('scroll', alHacerScroll, { passive: true });
    return () => window.removeEventListener('scroll', alHacerScroll);
  }, [bloqueada]);

  /* Bloqueada siempre se ve, y eso se deriva aquí en vez de guardarse con un
     `setOculta(false)` dentro del efecto: es un valor que se calcula a partir de
     otro, y duplicarlo en estado abre la puerta a que los dos discrepen. */
  return !bloqueada && oculta;
}
