import { useEffect, useState } from 'react';

/** Alto de la franja inferior donde vive el botón flotante: 56 px más su margen y aire. */
const FRANJA = 96;

/**
 * Cuánto antes de tocar la franja se aparta el botón, por arriba y por abajo.
 * Se va en 300 ms: si esperara a que el bloque entrara a la franja, en un
 * scroll normal se alcanzaría a ver el cruce mientras se retira.
 */
const ANTICIPO = 80;

/** Atributo que marca un bloque que el botón flotante no debe tapar nunca. */
export const SIN_FLOTANTE = 'data-sin-flotante';

/**
 * Si algún bloque marcado con `data-sin-flotante` está pasando por la franja
 * de abajo de la pantalla, donde vive el botón flotante.
 *
 * Esconder el botón solo al bajar no alcanza: en la portada los contadores
 * del hero cruzan esa franja justo en los primeros 150 px de scroll, donde el
 * botón todavía no se aparta, y al subir vuelve encima de ellos. Mirar la
 * franja y no la posición del scroll sirve para cualquier pantalla y cualquier
 * alto de teléfono.
 *
 * Depende de `ruta` porque los bloques marcados cambian con la página. Busca
 * las marcas una vez por ruta: sirve para la portada, que no se carga diferida.
 * Una página con `lazy()` (El Templo, Preguntas) monta después de este efecto,
 * así que si algún día lleva marcas habrá que volver a buscar al montarla.
 */
export function useFranjaDelFlotante(ruta: string): boolean {
  const [pisa, setPisa] = useState(false);

  useEffect(() => {
    const marcados = document.querySelectorAll(`[${SIN_FLOTANTE}]`);
    let observador: IntersectionObserver | null = null;
    const enFranja = new Set<Element>();

    /* La raíz es la franja de abajo, ampliada por los dos lados: el margen
       superior negativo recorta la ventana y el inferior positivo la estira
       por debajo del borde, para ver venir un bloque antes de que asome. Se
       rearma al cambiar el alto, que en un teléfono pasa al aparecer y
       desaparecer la barra del navegador. */
    const armar = () => {
      observador?.disconnect();
      enFranja.clear();
      if (!marcados.length) return;
      const arriba = Math.max(0, window.innerHeight - FRANJA - ANTICIPO);
      observador = new IntersectionObserver(
        (entradas) => {
          for (const e of entradas) {
            if (e.isIntersecting) enFranja.add(e.target);
            else enFranja.delete(e.target);
          }
          setPisa(enFranja.size > 0);
        },
        { rootMargin: `-${arriba}px 0px ${ANTICIPO}px 0px` },
      );
      marcados.forEach((m) => observador?.observe(m));
    };

    armar();
    window.addEventListener('resize', armar);
    return () => {
      window.removeEventListener('resize', armar);
      observador?.disconnect();
      /* Al cambiar de página el bloque que lo apartaba ya no existe: sin esto
         el botón quedaría escondido en una ruta sin marcas. */
      setPisa(false);
    };
  }, [ruta]);

  return pisa;
}
