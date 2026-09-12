import { useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { marcasPorLinea, type MarcasPorLinea } from '../lib/marcas';

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
