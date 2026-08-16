import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { SmartImage } from './SmartImage';

/**
 * El flyer que recibe a quien entra a la portada.
 *
 * Se muestra una sola vez por anuncio: quien lo cierra no lo vuelve a ver, y
 * esa decisión se guarda contra el id del anuncio. Cuando el dueño publica un
 * flyer nuevo cambia el id desde el panel y vuelve a aparecerle a todos, sin
 * tener que pedirle a nadie que borre nada del navegador.
 *
 * Solo se monta en la portada. Un anuncio que salta en cada pantalla del sitio
 * deja de ser un anuncio y se vuelve un peaje.
 */

/** Margen antes de aparecer: primero que cargue la página, y después el flyer. */
const RETARDO_MS = 1500;

const LLAVE = 'papi_shoes_anuncio_visto_';

function yaLoVio(id: string): boolean {
  try {
    return localStorage.getItem(LLAVE + id) === '1';
  } catch {
    /* Almacenamiento bloqueado —modo privado, permisos—: se prefiere mostrarlo
       de más antes que fallar. Cerrarlo seguirá funcionando en esta carga. */
    return false;
  }
}

function anotarQueLoVio(id: string): void {
  try {
    localStorage.setItem(LLAVE + id, '1');
  } catch {
    /* almacenamiento bloqueado */
  }
}

export function AnnouncementPopup() {
  const { settings } = useStore();
  const anuncio = settings.popupAnnouncement;
  const [abierto, setAbierto] = useState(false);

  const cerrarRef = useRef<HTMLButtonElement>(null);
  /** Dónde estaba el foco antes de abrir, para devolverlo al cerrar. */
  const focoPrevio = useRef<HTMLElement | null>(null);

  /* `validatePopupAnnouncement` ya apaga el anuncio al que le falte imagen o
     id, así que aquí basta con mirar el interruptor. */
  const activo = anuncio.enabled;

  useEffect(() => {
    if (!activo || yaLoVio(anuncio.id)) return;
    const temporizador = setTimeout(() => setAbierto(true), RETARDO_MS);
    return () => clearTimeout(temporizador);
  }, [activo, anuncio.id]);

  const cerrar = useCallback(() => {
    anotarQueLoVio(anuncio.id);
    setAbierto(false);
  }, [anuncio.id]);

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
