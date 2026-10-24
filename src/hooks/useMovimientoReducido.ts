import { useEffect, useState } from 'react';

const CONSULTA = '(prefers-reduced-motion: reduce)';

/**
 * Si el visitante pidió menos movimiento en su sistema.
 *
 * El CSS ya apaga animaciones y transiciones con esa preferencia, pero lo que
 * se mueve desde JavaScript —la rotación del hero, la curva del arco— no se
 * entera solo. Se escucha el cambio porque se puede activar con la página
 * abierta.
 */
export function useMovimientoReducido(): boolean {
  const [reducido, setReducido] = useState(
    () => window.matchMedia(CONSULTA).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(CONSULTA);
    const cambiar = () => setReducido(mq.matches);
    mq.addEventListener('change', cambiar);
    return () => mq.removeEventListener('change', cambiar);
  }, []);
  return reducido;
}
