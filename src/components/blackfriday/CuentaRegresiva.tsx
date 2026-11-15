import { useEffect, useState } from 'react';
import { FIN_BLACK_FRIDAY } from '../../lib/temporada';
import { cx } from '../../lib/utils';

interface Faltan {
  dias: number;
  horas: number;
  minutos: number;
  segundos: number;
}

function cuantoFalta(ahora: number): Faltan {
  const ms = Math.max(0, FIN_BLACK_FRIDAY - ahora);
  const s = Math.floor(ms / 1000);
  return {
    dias: Math.floor(s / 86_400),
    horas: Math.floor((s % 86_400) / 3600),
    minutos: Math.floor((s % 3600) / 60),
    segundos: s % 60,
  };
}

/**
 * Lo que falta para que termine el Black Friday, al segundo.
 *
 * Al llegar a cero recarga la página una vez: así los precios, la cinta y el
 * bloque de la portada vuelven a la normalidad sin que el visitante tenga que
 * saber que la campaña acabó. Con la pestaña al fondo el navegador espacia el
 * temporizador, y al volver se corrige solo porque se calcula contra el reloj.
 */
function useCuentaRegresiva(): Faltan {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Date.now();
      setAhora(t);
      if (t >= FIN_BLACK_FRIDAY) {
        window.clearInterval(id);
        window.location.reload();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return cuantoFalta(ahora);
}

const dos = (n: number) => String(n).padStart(2, '0');

/**
 * La cuenta regresiva en cuatro casillas, para el bloque de la portada.
 *
 * Los dígitos no se animan: cambian cada segundo y son un dato que se lee, no
 * un adorno; un giro en cada tic sería ruido. Van en cifras tabulares para que
 * el ancho no baile al pasar de 11 a 10.
 */
export function CuentaRegresiva({ className }: { className?: string }) {
  const f = useCuentaRegresiva();
  const casillas: [number, string][] = [
    [f.dias, f.dias === 1 ? 'Día' : 'Días'],
    [f.horas, 'Horas'],
    [f.minutos, 'Min'],
    [f.segundos, 'Seg'],
  ];

  return (
    <div
      role="timer"
      aria-label={`Faltan ${f.dias} días, ${f.horas} horas y ${f.minutos} minutos para que termine el Black Friday`}
      className={cx('flex items-stretch gap-2 sm:gap-3', className)}
    >
      {casillas.map(([n, rotulo], i) => (
        <div
          key={rotulo}
          aria-hidden
          className="flex min-w-[64px] sm:min-w-[84px] flex-col items-center rounded-tarjeta border border-white/10 bg-obsidian/70 px-3 py-3 sm:py-4"
        >
          <span className="font-display text-[34px] sm:text-[48px] leading-none text-marble tabular-nums">
            {i === 0 ? f.dias : dos(n)}
          </span>
          <span className="mt-2 text-rotulo font-semibold uppercase tracking-[0.18em] text-terciario">
            {rotulo}
          </span>
        </div>
      ))}
    </div>
  );
}

/** La misma cuenta en una línea, para rótulos: "Termina en 15 d 04 h 22 min". */
export function CuentaRegresivaCorta({ className }: { className?: string }) {
  const f = useCuentaRegresiva();
  const texto =
    f.dias > 0
      ? `${f.dias} d ${dos(f.horas)} h ${dos(f.minutos)} min`
      : `${dos(f.horas)} h ${dos(f.minutos)} min ${dos(f.segundos)} s`;
  return <span className={cx('tabular-nums', className)}>{texto}</span>;
}
