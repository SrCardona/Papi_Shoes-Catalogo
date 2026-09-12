import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import type { MarcaConteo } from '../../lib/marcas';
import { cx } from '../../lib/utils';

interface BrandDropdownProps {
  /** Ruta de la línea: `/originales` o `/sneakers`. */
  to: string;
  label: string;
  /** Las marcas de esa línea, ya ordenadas y sin "Otras". */
  marcas: MarcaConteo[];
}

/** Margen para que rozar el borde al bajar el cursor no cierre el menú. */
const RETRASO_CIERRE_MS = 150;

/**
 * El desplegable de marcas de una línea, para la barra de escritorio.
 *
 * La línea va siempre por delante de la marca: cada opción lleva a
 * `/originales?marca=X` o `/sneakers?marca=X`, nunca a la marca suelta. Mezclar
 * las dos líneas haría que un par de uso diario apareciera junto a uno con
 * legit check, y el cliente daría por original todo lo que ve.
 *
 * Se abre con el cursor y también con clic, porque son dos gestos que la gente
 * usa indistintamente y el hover solo deja fuera a quien navega con teclado.
 */
export function BrandDropdown({ to, label, marcas }: BrandDropdownProps) {
  const location = useLocation();
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const opcionesRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const cierreRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelaCierre = useCallback(() => {
    if (cierreRef.current) {
      clearTimeout(cierreRef.current);
      cierreRef.current = null;
    }
  }, []);

  const cierra = useCallback(() => {
    cancelaCierre();
    setAbierto(false);
  }, [cancelaCierre]);

  /* Al salir con el mouse no se cierra en el acto: el recorrido natural del
     cursor hacia la primera marca pasa por fuera del botón, y cerrar ahí es el
     tropiezo clásico de estos menús. */
  const cierraConRetraso = useCallback(() => {
    cancelaCierre();
    cierreRef.current = setTimeout(() => setAbierto(false), RETRASO_CIERRE_MS);
  }, [cancelaCierre]);

  useEffect(() => cancelaCierre, [cancelaCierre]);

  /* Clic fuera y Escape. Solo se escucha mientras está abierto: un listener
     permanente en el documento por cada menú de la barra no hace falta. */
  useEffect(() => {
    if (!abierto) return;

    const alTocarFuera = (e: MouseEvent) => {
      if (!contenedorRef.current?.contains(e.target as Node)) setAbierto(false);
    };
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setAbierto(false);
      botonRef.current?.focus();
    };

    document.addEventListener('mousedown', alTocarFuera);
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('mousedown', alTocarFuera);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [abierto]);

  /** Abre y deja el foco en una opción, para seguir con las flechas. */
  const abreEnfocando = (indice: number) => {
    setAbierto(true);
    /* En el siguiente cuadro: las opciones todavía no están montadas. */
    requestAnimationFrame(() => opcionesRef.current[indice]?.focus());
  };

  const total = marcas.length + 1; // "Ver todos" ocupa la primera posición

  const alTeclearEnBoton = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      abreEnfocando(0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      abreEnfocando(total - 1);
    }
  };

  const alTeclearEnOpcion = (e: React.KeyboardEvent, indice: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      opcionesRef.current[(indice + 1) % total]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      opcionesRef.current[(indice - 1 + total) % total]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      opcionesRef.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      opcionesRef.current[total - 1]?.focus();
    } else if (e.key === 'Tab') {
      // Salir con Tab cierra, pero sin robarle el foco al navegador.
      setAbierto(false);
    }
  };

  /* Una línea sin pares no tiene nada que desplegar: el elemento se comporta
     como el enlace simple que era antes. */
  if (!marcas.length) {
    return (
      <NavLink to={to} className={enlaceDeBarra}>
        {({ isActive }) => (
          <>
            {label}
            {isActive && <span className={subrayadoActivo} />}
          </>
        )}
      </NavLink>
    );
  }

  /* El subrayado de "estás aquí" lo pone el botón, que no es un NavLink. */
  const enLaLinea = location.pathname === to;

  const opciones = [
    /* "Ver todos" manda la marca vacía a propósito. Si solo apuntara a la ruta,
       estando ya en la línea con una marca filtrada no cambiaría la URL, React
       Router no navegaría y el filtro se quedaría puesto: el enlace no haría
       nada justo cuando más se necesita. */
    { to: `${to}?marca=`, label: 'Ver todos', count: null as number | null },
    ...marcas.map((m) => ({
      to: `${to}?marca=${encodeURIComponent(m.brand)}`,
      label: m.brand,
      count: m.count,
    })),
  ];

  return (
    <div
      ref={contenedorRef}
      className="relative"
      onMouseEnter={() => {
        cancelaCierre();
        setAbierto(true);
      }}
      onMouseLeave={cierraConRetraso}
    >
      <button
        ref={botonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => (abierto ? cierra() : setAbierto(true))}
        onKeyDown={alTeclearEnBoton}
        className={cx(
          'relative flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] transition-colors py-2',
          enLaLinea ? 'text-marble' : 'text-marble/45 hover:text-marble/85',
        )}
      >
        {label}
        <ChevronDown
          className={cx(
            'w-3 h-3 transition-transform duration-200',
            abierto && 'rotate-180',
          )}
          aria-hidden
        />
        {enLaLinea && <span className={subrayadoActivo} />}
      </button>

      {abierto && (
        <div
          role="menu"
          aria-label={`Marcas de ${label}`}
          /* `max-h` con scroll propio para que una línea con muchas marcas no
             se salga por abajo en un portátil de 768 px de alto. El ancho se
             corta contra la ventana por la misma razón. */
          className="absolute left-0 top-full pt-3 w-56 max-w-[calc(100vw-2rem)] animate-drop"
        >
          <div className="border border-white/8 bg-obsidian/98 backdrop-blur-xl max-h-[min(28rem,calc(100vh-8rem))] overflow-y-auto">
            {opciones.map((opcion, i) => (
              <NavLink
                key={opcion.label}
                to={opcion.to}
                role="menuitem"
                ref={(el) => {
                  opcionesRef.current[i] = el;
                }}
                onClick={cierra}
                onKeyDown={(e) => alTeclearEnOpcion(e, i)}
                className={cx(
                  'flex items-center justify-between gap-4 px-4 py-3 border-b border-white/6 last:border-b-0 transition-colors',
                  'text-[11.5px] text-marble/65 hover:text-marble hover:bg-white/5',
                  'focus:outline-none focus:text-marble focus:bg-white/8',
                  opcion.count === null && 'text-marble/90',
                )}
              >
                <span className="truncate">{opcion.label}</span>
                {opcion.count !== null && (
                  <span className="text-[10px] text-marble/30 tabular-nums shrink-0">
                    {opcion.count}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* Mismo trazo que el resto de la barra: el desplegable no puede parecer de otra
   familia que los enlaces de al lado. */
const subrayadoActivo = 'absolute -bottom-0.5 inset-x-0 h-px bg-silver/70';

interface BrandAccordionProps extends BrandDropdownProps {
  /** Cierra el menú de pantalla completa al elegir. */
  onNavigate: () => void;
  /** Retraso de entrada, para acompañar la cascada del menú. */
  delay: number;
}

/**
 * La versión móvil: un acordeón dentro del menú de pantalla completa.
 *
 * No es el mismo componente con otras clases porque no es el mismo gesto. En un
 * teléfono no hay cursor que pueda posarse encima, así que un menú que solo
 * abriera con hover quedaría muerto justo donde entra la mayoría de la gente.
 */
export function BrandAccordion({
  to,
  label,
  marcas,
  onNavigate,
  delay,
}: BrandAccordionProps) {
  const [abierto, setAbierto] = useState(false);

  if (!marcas.length) {
    return (
      <NavLink
        to={to}
        onClick={onNavigate}
        style={{ animationDelay: `${delay}ms` }}
        className={({ isActive }) =>
          cx(
            'font-display text-3xl py-3.5 border-b border-white/6 animate-rise transition-colors',
            isActive ? 'text-marble' : 'text-marble/45',
          )
        }
      >
        {label}
      </NavLink>
    );
  }

  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="border-b border-white/6 animate-rise"
    >
      <button
        type="button"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-3.5 text-left"
      >
        <span className="font-display text-3xl text-marble/45">{label}</span>
        <ChevronDown
          className={cx(
            'w-5 h-5 shrink-0 text-marble/35 transition-transform duration-200',
            abierto && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {abierto && (
        <div className="pb-2 animate-drop">
          {[
            { to: `${to}?marca=`, label: 'Ver todos', count: null as number | null },
            ...marcas.map((m) => ({
              to: `${to}?marca=${encodeURIComponent(m.brand)}`,
              label: m.brand,
              count: m.count,
            })),
          ].map((opcion) => (
            <NavLink
              key={opcion.label}
              to={opcion.to}
              onClick={onNavigate}
              /* 44 px de alto mínimo: es lo que necesita un pulgar para no
                 fallar entre dos marcas seguidas. La sangría deja claro que
                 cuelgan de la línea de arriba. */
              className="flex items-center justify-between gap-4 min-h-[44px] pl-5 pr-1 py-2 text-marble/55 active:text-marble"
            >
              <span className="text-[14px] truncate">{opcion.label}</span>
              {opcion.count !== null && (
                <span className="text-[11px] text-marble/30 tabular-nums shrink-0">
                  {opcion.count}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function enlaceDeBarra({ isActive }: { isActive: boolean }) {
  return cx(
    'relative text-[10px] font-semibold uppercase tracking-[0.22em] transition-colors py-2',
    isActive ? 'text-marble' : 'text-marble/45 hover:text-marble/85',
  );
}
