import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { SmartImage } from './SmartImage';

/**
 * El flyer que recibe a quien abre el sitio.
 *
 * Se muestra en cada entrada directa a la portada —escribir la dirección, un
 * marcador, un enlace de Instagram, recargar—, y en ninguna otra situación. Al
 * volver a la portada desde el catálogo no reaparece: quien ya está adentro
 * navegando no es alguien que esté llegando, y un anuncio que salta cada vez
 * que se toca "Inicio" deja de ser un anuncio y se vuelve un peaje.
 */

/** Margen antes de aparecer: primero que cargue la página, y después el flyer. */
const RETARDO_MS = 1500;

/**
 * Ya se mostró en esta carga del documento.
 *
 * Vive fuera del componente a propósito: `HomePage` se monta y se desmonta con
 * cada navegación, y el botón de atrás del navegador puede devolver la
 * ubicación de entrada tal cual, con su misma clave. Esta marca solo se borra
 * con una carga nueva de la página, que es justo lo que queremos contar.
 */
let yaSeMostro = false;

/**
 * La entrada del historial con la que el navegador abrió este documento.
 *
 * React Router guarda una clave en `history.state` por cada ubicación, y esa
 * clave es la misma que devuelve `location.key`. Comparar contra ella separa
 * las dos cosas que hay que separar: el documento se abrió aquí, o se llegó
 * aquí navegando por dentro del sitio.
 *
 * No sirve comparar contra `'default'` a secas —que es la clave que Router le
 * pone a una ubicación recién estrenada—, porque el estado del historial
 * sobrevive a recargar la página: quien navega por el catálogo, vuelve a la
 * portada y aprieta F5 sigue teniendo la clave de esa navegación, y recargar sí
 * es entrar. Se lee al cargar el módulo, antes de que Router toque el historial.
 */
const CLAVE_DE_ENTRADA =
  (typeof window !== 'undefined'
    ? (window.history.state as { key?: string } | null)?.key
    : undefined) ?? 'default';

export function AnnouncementPopup() {
  const { settings } = useStore();
  const location = useLocation();
  const anuncio = settings.popupAnnouncement;
  const [abierto, setAbierto] = useState(false);

  const cerrarRef = useRef<HTMLButtonElement>(null);
  /** Dónde estaba el foco antes de abrir, para devolverlo al cerrar. */
  const focoPrevio = useRef<HTMLElement | null>(null);

  /* `validatePopupAnnouncement` ya apaga el anuncio al que le falte imagen, así
     que aquí basta con mirar el interruptor. */
  const activo = anuncio.enabled;

  /* Seguimos en la ubicación con la que se abrió el documento: nadie navegó
     para llegar hasta aquí. Contar montajes no serviría —StrictMode los
     duplica— y `yaSeMostro` cubre el resto: volver con el botón de atrás
     recupera la clave de entrada, pero el anuncio ya salió en esta carga. */
  const esEntradaDirecta = location.key === CLAVE_DE_ENTRADA;

  useEffect(() => {
    if (!activo || yaSeMostro || !esEntradaDirecta) return;
    const temporizador = setTimeout(() => {
      yaSeMostro = true;
      setAbierto(true);
    }, RETARDO_MS);
    return () => clearTimeout(temporizador);
  }, [activo, esEntradaDirecta]);

  const cerrar = useCallback(() => setAbierto(false), []);

  /* Escape, bloqueo del fondo y foco: el mismo trato que el visor de entregas.
     El foco entra al botón de cerrar —lo primero que alguien con teclado quiere
     hacer con un anuncio— y al salir vuelve a donde estaba. */
  useEffect(() => {
    if (!abierto) return;

    focoPrevio.current = document.activeElement as HTMLElement | null;
    cerrarRef.current?.focus();

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar();
    };
    document.addEventListener('keydown', alTeclear);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = '';
      focoPrevio.current?.focus?.();
    };
  }, [abierto, cerrar]);

  if (!abierto || !activo) return null;

  const descripcion = anuncio.alt || 'Anuncio de PAPI SHOES';

  const flyer = (
    <SmartImage
      src={anuncio.image}
      alt={descripcion}
      loading="lazy"
      /* Vertical de historia: manda el alto, y el ancho lo sigue. `contain` y
         `max-w-full` son lo que evita que en un celular angosto se recorte. */
      className="max-h-[85vh] max-w-full w-auto h-auto object-contain border border-white/10"
    />
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={descripcion}
      onClick={cerrar}
      className="fixed inset-0 z-[60] bg-obsidian/92 backdrop-blur-sm animate-fade flex items-center justify-center p-4"
    >
      {/* El clic de afuera cierra; el de adentro no debe. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative animate-rise max-h-[85vh]"
      >
        <button
          ref={cerrarRef}
          onClick={cerrar}
          aria-label="Cerrar anuncio"
          /* 44x44 y placa obsidiana con borde: el flyer puede ser de cualquier
             color, así que la X no puede depender de lo que tenga debajo. */
          className="absolute -top-3 -right-3 z-10 w-11 h-11 flex items-center justify-center bg-obsidian border border-silver/40 text-marble hover:border-silver hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {anuncio.link ? (
          <a
            href={anuncio.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block focus:outline-none focus-visible:ring-1 focus-visible:ring-silver"
          >
            {flyer}
          </a>
        ) : (
          flyer
        )}
      </div>
    </div>
  );
}
