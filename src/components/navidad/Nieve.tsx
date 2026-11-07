import { useMemo } from 'react';
import { useMovimientoReducido } from '../../hooks/useMovimientoReducido';

/* Menos copos en el teléfono: la pantalla es la quinta parte y con los mismos
   cuarenta parecía una tormenta tapando las tarjetas. */
const COPOS_ESCRITORIO = 40;
const COPOS_TELEFONO = 18;

interface Copo {
  izquierda: number;
  tamano: number;
  opacidad: number;
  duracion: number;
  retraso: number;
  deriva: number;
}

/** Número entre `min` y `max`, del azar. */
function entre(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Nieve que cae sobre la página en Navidad.
 *
 * Solo CSS: cada copo es un punto que baja con `transform`, que el navegador
 * mueve en la tarjeta gráfica sin recalcular la página. Las posiciones se
 * sortean una vez al montar, no en cada render.
 *
 * Va por debajo de la barra (z-30 contra z-40) para no pasar por encima del
 * menú, y no recibe clics. Con movimiento reducido no se monta: nieve quieta
 * son manchas blancas sobre las fotos.
 */
export function Nieve() {
  const reducido = useMovimientoReducido();

  const copos = useMemo<Copo[]>(() => {
    const total = window.innerWidth < 640 ? COPOS_TELEFONO : COPOS_ESCRITORIO;
    return Array.from({ length: total }, () => ({
      izquierda: entre(0, 100),
      tamano: entre(2, 5),
      opacidad: entre(0.35, 0.8),
      duracion: entre(9, 20),
      /* Retraso negativo: el copo arranca ya a mitad de camino. Sin esto la
         página abre con el cielo vacío y la nieve entra toda junta desde arriba. */
      retraso: -entre(0, 20),
      deriva: entre(-40, 40),
    }));
  }, []);

  if (reducido) return null;

  return (
    <div aria-hidden className="nieve">
      {copos.map((c, i) => (
        <i
          key={i}
          style={
            {
              left: `${c.izquierda}%`,
              width: c.tamano,
              height: c.tamano,
              opacity: c.opacidad,
              animationDuration: `${c.duracion}s`,
              animationDelay: `${c.retraso}s`,
              '--deriva': `${c.deriva}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
