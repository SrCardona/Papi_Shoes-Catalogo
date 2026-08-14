import { useState } from 'react';
import {
  AlertCircle,
  Cloud,
  CloudOff,
  Download,
  Loader2,
  Upload,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore, type EstadoNubeUI } from '../context/StoreContext';
import { cx } from '../lib/utils';

/**
 * Lo que el dueño necesita saber de la sincronización: si lo que está viendo ya
 * quedó publicado o si todavía vive solo en este navegador.
 *
 * Antes no había nada que mostrar porque no había nada que sincronizar: todo
 * quedaba en el equipo donde se hizo el cambio.
 */
function hora(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

interface Resumen {
  Icono: typeof Cloud;
  texto: string;
  tono: string;
  girando: boolean;
}

function resumir(nube: EstadoNubeUI, puedeEscribir: boolean): Resumen {
  if (nube.modo === 'cargando') {
    return {
      Icono: Loader2,
      texto: 'Consultando la nube',
      tono: 'text-marble/35',
      girando: true,
    };
  }
  if (nube.modo === 'sin-nube') {
    return {
      Icono: CloudOff,
      texto: 'Sin nube: los cambios se quedan en este navegador',
      tono: 'text-marble/35',
      girando: false,
    };
  }
  /* Almacén conectado pero sin las variables del PIN: nadie puede escribir, y sin
     este aviso el panel se quedaría diciendo "cambios sin publicar" para siempre
     sin explicar por qué. */
  if (!puedeEscribir) {
    return {
      Icono: AlertCircle,
      texto:
        'La nube está conectada pero falta el PIN del servidor (ADMIN_PIN_HASH y ADMIN_SESSION_SECRET)',
      tono: 'text-amber-300/80',
      girando: false,
    };
  }
  if (nube.sincronizando) {
    return {
      Icono: Loader2,
      texto: 'Publicando en la nube',
      tono: 'text-marble/45',
      girando: true,
    };
  }
  if (nube.mensaje) {
    return {
      Icono: AlertCircle,
      texto: nube.mensaje,
      tono: 'text-amber-300/80',
      girando: false,
    };
  }
  if (nube.pendiente) {
    return {
      Icono: Upload,
      texto: 'Cambios sin publicar',
      tono: 'text-amber-300/80',
      girando: false,
    };
  }
  return {
    Icono: Cloud,
    texto: nube.actualizadoEn
      ? `Publicado · ${hora(nube.actualizadoEn)}`
      : 'Publicado',
    tono: 'text-emerald-300/70',
    girando: false,
  };
}

/** Línea de estado para el encabezado del panel. */
export function NubeIndicador() {
  const { nube } = useStore();
  const { validaEnServidor } = useAuth();
  const { Icono, texto, tono, girando } = resumir(nube, validaEnServidor);

  return (
    <p className={cx('flex items-center gap-1.5 text-[11px] mt-1', tono)}>
      <Icono className={cx('w-3 h-3 shrink-0', girando && 'animate-spin')} />
      <span className="truncate max-w-[46ch]">{texto}</span>
    </p>
  );
}

/** Sección completa, para Ajustes. */
export function NubePanel() {
  const { nube, publicarAhora, traerDeLaNube } = useStore();
  const { validaEnServidor } = useAuth();
  const [trabajando, setTrabajando] = useState(false);
  const { Icono, texto, tono, girando } = resumir(nube, validaEnServidor);

  const ocupado = trabajando || nube.sincronizando || nube.modo === 'cargando';

  const publicar = async () => {
    setTrabajando(true);
    await publicarAhora();
    setTrabajando(false);
  };

  const traer = async () => {
    const ok = confirm(
      'Esto reemplaza lo que tienes en este navegador por la versión publicada en la nube. ¿Continuar?',
    );
    if (!ok) return;
    setTrabajando(true);
    await traerDeLaNube();
    setTrabajando(false);
  };

  return (
    <section className="space-y-5">
      <div className="pb-4 border-b border-white/10">
        <h2 className="font-display text-2xl text-marble">Nube</h2>
        <p className="text-[12px] text-marble/40 mt-1">
          Donde queda guardado lo que editas, para que lo vean todos los equipos.
        </p>
      </div>

      <div className="bg-basalt border border-white/10 p-5 space-y-4">
        <p className={cx('flex items-start gap-2 text-[12px] leading-relaxed', tono)}>
          <Icono className={cx('w-3.5 h-3.5 shrink-0 mt-0.5', girando && 'animate-spin')} />
          {texto}
        </p>

        {nube.modo === 'sin-nube' ? (
          <p className="text-[11.5px] text-marble/45 leading-relaxed">
            Este sitio todavía no tiene almacén conectado, así que cada cambio
            vive únicamente en el navegador donde lo hiciste. Los pasos para
            conectarlo están en el README, en la sección "Guardar los cambios en
            la nube": son dos variables de entorno y un Blob Store en Vercel.
          </p>
        ) : !validaEnServidor ? (
          <p className="text-[11.5px] text-marble/45 leading-relaxed">
            El almacén está conectado, pero el servidor no puede autorizar
            cambios porque le faltan las variables{' '}
            <code className="text-silver">ADMIN_PIN_HASH</code> y{' '}
            <code className="text-silver">ADMIN_SESSION_SECRET</code> en Vercel.
            Configúralas y vuelve a desplegar: mientras tanto, lo que edites se
            queda en este navegador.
          </p>
        ) : (
          <p className="text-[11.5px] text-marble/45 leading-relaxed">
            Cada cambio del panel se publica solo, un segundo y medio después de
            que dejas de editar. Las fotos que subes desde el dispositivo se
            guardan aparte y en el catálogo queda su dirección, así que dejan de
            ocupar espacio en el navegador. El usuario y el PIN nunca se publican.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void publicar()}
            disabled={ocupado || nube.modo !== 'lista' || !validaEnServidor}
            className="flex items-center gap-2 px-5 py-3 border border-white/14 text-marble/70 hover:text-marble hover:border-silver/45 disabled:opacity-40 disabled:hover:text-marble/70 disabled:hover:border-white/14 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Publicar ahora
          </button>

          <button
            type="button"
            onClick={() => void traer()}
            disabled={ocupado || nube.modo !== 'lista'}
            className="flex items-center gap-2 px-5 py-3 border border-white/14 text-marble/70 hover:text-marble hover:border-silver/45 disabled:opacity-40 disabled:hover:text-marble/70 disabled:hover:border-white/14 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Traer de la nube
          </button>
        </div>

        <p className="text-[11px] text-marble/30 leading-relaxed">
          "Traer de la nube" descarta lo que tengas sin publicar en este
          navegador. Úsalo cuando editaste desde dos equipos y quieres quedarte
          con la versión del otro.
        </p>
      </div>
    </section>
  );
}
