import { useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import {
  agruparMarcas,
  marcasPorLinea,
  type GrupoOtras,
  type MarcasAgrupadas,
  type MarcasPorLinea,
} from '../lib/marcas';
import type { SneakerCategory } from '../types';

/**
 * Las marcas de cada línea, sacadas del catálogo y no escritas a mano.
 *
 * Es lo que permite que el menú de navegación se mantenga solo: el día que
 * entre una marca nueva aparece sola, y la que se quede sin pares desaparece,
 * sin que nadie tenga que acordarse de editar una lista.
 *
 * El cálculo vive en `lib/marcas.ts`, sin React de por medio, para poder
 * comprobarlo aparte.
 */
export function useMarcasPorLinea(): MarcasPorLinea {
  const { sneakers } = useStore();
  return useMemo(() => marcasPorLinea(sneakers), [sneakers]);
}

export interface MarcasAgrupadasPorLinea {
  originales: MarcasAgrupadas;
  general: MarcasAgrupadas;
}

/**
 * El reparto entre marcas con apartado propio y "Otras marcas", por línea.
 *
 * La usan el menú, el catálogo y el muro de la portada, y ese es justamente el
 * punto: el conteo que promete el desplegable tiene que ser el mismo que se ve
 * al llegar, y eso solo se sostiene si nadie lo calcula por su cuenta.
 */
export function useMarcasAgrupadas(): MarcasAgrupadasPorLinea {
  const { sneakers } = useStore();

  return useMemo(() => {
    const agrupadas: MarcasAgrupadasPorLinea = {
      originales: agruparMarcas(sneakers, 'originales'),
      general: agruparMarcas(sneakers, 'general'),
    };

    /* Un umbral que deja una sola marca en pie y todo lo demás revuelto no está
       ordenando el menú, lo está vaciando. Solo se avisa en desarrollo: en
       producción no hay nada que el visitante pueda hacer al respecto. */
    if (import.meta.env.DEV) {
      for (const [linea, datos] of Object.entries(agrupadas)) {
        if (datos.principales.length === 1 && datos.otras.count > 0) {
          console.warn(
            `[marcas] En la línea "${linea}" el umbral deja una sola marca con ` +
              `apartado propio (${datos.principales[0].brand}) y ${datos.otras.count} ` +
              `pares en "Otras marcas". Revisa MINIMO_PARA_APARTADO_PROPIO.`,
          );
        }
      }
    }

    return agrupadas;
  }, [sneakers]);
}

/** El grupo "Otras marcas" de una línea concreta, para filtrar el catálogo. */
export function useGrupoOtras(category?: SneakerCategory): GrupoOtras | null {
  const agrupadas = useMarcasAgrupadas();
  /* Sin línea fija (la vista /catalogo, que mezcla las dos) no hay un grupo
     único: el reparto se evalúa por línea y juntarlos daría un conteo que no
     coincide con ningún menú. */
  if (!category) return null;
  return agrupadas[category].otras;
}
