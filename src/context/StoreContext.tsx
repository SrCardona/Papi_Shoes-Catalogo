import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Delivery, Sneaker, StoreSettings } from '../types';
import {
  INITIAL_DELIVERIES,
  INITIAL_SETTINGS,
  INITIAL_SNEAKERS,
} from '../data/initialData';
import {
  validateDeliveries,
  validateSettings,
  validateSneakers,
} from '../lib/validation';
import {
  guardarEstado,
  leeToken,
  leerEstado,
  subirFotos,
  type BorradorNube,
  type EstadoNube,
} from '../lib/nube';

const INVENTORY_KEY = 'papi_shoes_inventory';
const SETTINGS_KEY = 'papi_shoes_settings';
const DELIVERIES_KEY = 'papi_shoes_deliveries';
const CATALOG_VERSION_KEY = 'papi_shoes_catalog_version';
/** Cuándo se editó algo en ESTE navegador. Decide quién manda contra la nube. */
const LOCAL_STAMP_KEY = 'papi_shoes_editado';

/** Margen entre el último cambio y la publicación, para no subir tecla por tecla. */
const RETARDO_PUBLICACION_MS = 1500;

/**
 * Huella del catálogo que viene en el código.
 *
 * Existe para resolver el problema de siempre: el inventario guardado le gana al
 * del código, así que después de `npm run catalogo` el dueño no veía sus fotos
 * nuevas y tenía que hacer `localStorage.clear()` a mano —lo que también le
 * borraba los ajustes de la tienda—.
 *
 * Se calcula sola a partir de los pares generados, así que no hay ningún número
 * que acordarse de subir. Se dejan fuera `createdAt` y `updatedAt` a propósito:
 * cambian en cada corrida del generador, y sin excluirlos una regeneración que
 * no cambió nada borraría las ediciones hechas en el panel.
 *
 * La misma huella viaja al documento de la nube, con el mismo criterio.
 */
function computeCatalogFingerprint(): string {
  let hash = 0;
  for (const s of INITIAL_SNEAKERS) {
    const shape = `${s.id}|${s.name}|${s.brand}|${s.category}|${s.status}|${s.price}|${s.originalPrice ?? ''}|${s.sizes.join(',')}|${s.images.join(',')}`;
    for (let i = 0; i < shape.length; i++) {
      hash = (Math.imul(hash, 31) + shape.charCodeAt(i)) | 0;
    }
  }
  return `${INITIAL_SNEAKERS.length}-${(hash >>> 0).toString(36)}`;
}

/* El catálogo del código no cambia en tiempo de ejecución: se calcula una vez. */
const CATALOG_FINGERPRINT = computeCatalogFingerprint();

/**
 * Cómo va la sincronización con la nube.
 *
 * `sin-nube` no es un error: el sitio funciona igual que antes, con el catálogo
 * del código y lo guardado en este navegador. Solo significa que los cambios no
 * cruzan a otro equipo.
 */
export interface EstadoNubeUI {
  modo: 'cargando' | 'sin-nube' | 'lista';
  sincronizando: boolean;
  /** Hay cambios en este navegador que todavía no están publicados. */
  pendiente: boolean;
  /** Sello del documento que hay en la nube, si se pudo leer. */
  actualizadoEn: string | null;
  mensaje: string | null;
}

interface StoreContextValue {
  sneakers: Sneaker[];
  settings: StoreSettings;
  deliveries: Delivery[];
  setSneakers: (next: Sneaker[]) => void;
  setSettings: (next: StoreSettings) => void;
  upsertSneaker: (sneaker: Sneaker) => void;
  patchSneaker: (id: string, patch: Partial<Sneaker>) => void;
  removeSneaker: (id: string) => void;
  restoreSneaker: () => void;
  lastRemoved: Sneaker | null;
  getSneaker: (id: string) => Sneaker | undefined;
  setDeliveries: (next: Delivery[]) => void;
  upsertDelivery: (delivery: Delivery) => void;
  removeDelivery: (id: string) => void;
  resetCatalog: () => void;
  storageWarning: string | null;
  nube: EstadoNubeUI;
  /** Publica ya lo que haya en este navegador. Devuelve si quedó publicado. */
  publicarAhora: () => Promise<boolean>;
  /** Descarta lo local y se queda con lo que hay en la nube. */
  traerDeLaNube: () => Promise<boolean>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

/** Lee de localStorage pasando siempre por el validador. */
function loadInventory(): Sneaker[] {
  try {
    const raw = localStorage.getItem(INVENTORY_KEY);
    if (!raw) return INITIAL_SNEAKERS;

    /* Si el catálogo del código es otro (corriste `npm run catalogo`), manda el
       código y se descarta el inventario guardado. Solo se toca esta llave: los
       ajustes de la tienda, el PIN y el muro de entregas viven en otras y
       quedan intactos. */
    if (localStorage.getItem(CATALOG_VERSION_KEY) !== CATALOG_FINGERPRINT) {
      return INITIAL_SNEAKERS;
    }

    const parsed = validateSneakers(JSON.parse(raw));
    return parsed.length ? parsed : INITIAL_SNEAKERS;
  } catch {
    return INITIAL_SNEAKERS;
  }
}

/**
 * Las entregas viven en su propia llave: si el muro crece hasta llenar la
 * cuota del navegador, el inventario —que es lo que sostiene la venta— sigue
 * guardándose sin problema.
 */
function loadDeliveries(): Delivery[] {
  try {
    const raw = localStorage.getItem(DELIVERIES_KEY);
    if (!raw) return INITIAL_DELIVERIES;
    return validateDeliveries(JSON.parse(raw));
  } catch {
    return INITIAL_DELIVERIES;
  }
}

function loadSettings(): StoreSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return INITIAL_SETTINGS;
    const stored = JSON.parse(raw);
    const merged = validateSettings(stored, INITIAL_SETTINGS);
    // Las credenciales sí se conservan desde el almacenamiento local del dueño.
    return {
      ...merged,
      adminUsername: stored.adminUsername ?? INITIAL_SETTINGS.adminUsername,
      adminPinHash: stored.adminPinHash ?? INITIAL_SETTINGS.adminPinHash,
    };
  } catch {
    return INITIAL_SETTINGS;
  }
}

function leerSelloLocal(): string {
  try {
    return localStorage.getItem(LOCAL_STAMP_KEY) ?? '';
  } catch {
    return '';
  }
}

function escribirSelloLocal(sello: string): void {
  try {
    localStorage.setItem(LOCAL_STAMP_KEY, sello);
  } catch {
    /* almacenamiento lleno o bloqueado: ya lo reporta el aviso de la cuota */
  }
}

/**
 * Arma el documento que se publica.
 *
 * El usuario y el hash del PIN se quedan afuera a propósito: el documento lo
 * lee cualquier visitante, y publicar las credenciales sería repartirlas.
 */
function borradorDe(
  sneakers: Sneaker[],
  deliveries: Delivery[],
  settings: StoreSettings,
): BorradorNube {
  const { adminUsername: _usuario, adminPinHash: _hash, ...publicos } = settings;
  return {
    huellaCatalogo: CATALOG_FINGERPRINT,
    sneakers,
    deliveries,
    settings: publicos,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [sneakers, setSneakersState] = useState<Sneaker[]>(loadInventory);
  const [deliveries, setDeliveriesState] = useState<Delivery[]>(loadDeliveries);
  const [settings, setSettingsState] = useState<StoreSettings>(loadSettings);
  const [lastRemoved, setLastRemoved] = useState<Sneaker | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [nube, setNube] = useState<EstadoNubeUI>({
    modo: 'cargando',
    sincronizando: false,
    pendiente: false,
    actualizadoEn: null,
    mensaje: null,
  });

  /* Los datos vivos, para que publicar no dependa de las referencias del render
     y `publicarAhora` pueda ser estable. */
  const datosRef = useRef({ sneakers, deliveries, settings });
  useEffect(() => {
    datosRef.current = { sneakers, deliveries, settings };
  }, [sneakers, deliveries, settings]);

  /** Sello del documento sobre el que estamos editando: el control de conflictos. */
  const baseRef = useRef('');
  /** Última versión enviada, para no repetir un guardado idéntico. */
  const ultimoEnviadoRef = useRef('');
  const enviandoRef = useRef(false);
  /** Llegó un cambio mientras subía el anterior: hay que repetir al terminar. */
  const repetirRef = useRef(false);
  /** Cuándo se consultó la nube por última vez, para no consultarla de más. */
  const ultimoRefrescoRef = useRef(0);

  /* Persistencia local. Sigue siendo la copia de arranque —lo que se ve antes de
     que responda la nube— y el respaldo cuando no hay conexión. Si se supera la
     cuota del navegador avisamos en vez de fallar en silencio. */
  useEffect(() => {
    let failure: string | null = null;
    try {
      localStorage.setItem(INVENTORY_KEY, JSON.stringify(sneakers));
      localStorage.setItem(DELIVERIES_KEY, JSON.stringify(deliveries));
      // Se sella junto al inventario: a partir de aquí las ediciones del panel
      // vuelven a tener prioridad, hasta la próxima regeneración del catálogo.
      localStorage.setItem(CATALOG_VERSION_KEY, CATALOG_FINGERPRINT);
    } catch {
      failure =
        'El navegador se quedó sin espacio. Entra al panel para publicar en la nube (las fotos se suben aparte y dejan de ocupar el navegador) o borra entregas antiguas.';
    }
    // Escribir en localStorage es sincronización con un sistema externo, y su
    // fallo debe llegar al usuario: sin aviso, perdería trabajo sin enterarse.
    // El actualizador solo cambia el estado si el resultado es distinto, así
    // que no encadena renders en cada guardado.
    setStorageWarning((current) => (current === failure ? current : failure));
  }, [sneakers, deliveries]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* los ajustes son pequeños; si esto falla ya lo reporta el aviso de arriba */
    }
  }, [settings]);

  /**
   * Marca que este navegador tiene una edición propia.
   *
   * La llaman los mutadores, nunca un efecto: el reloj de la última edición
   * local es lo que decide, al arrancar, si manda la nube o si hay algo por
   * publicar. Si lo escribiera un efecto se marcaría también al hidratar desde
   * la nube, y todo parecería siempre pendiente.
   */
  const sellarCambioLocal = useCallback(() => {
    escribirSelloLocal(new Date().toISOString());
    setNube((prev) => (prev.pendiente ? prev : { ...prev, pendiente: true }));
  }, []);

  /** Reemplaza el estado por el de la nube. */
  const aplicarNube = useCallback((estado: EstadoNube) => {
    /* Si el código trae otro catálogo (se regeneró y se desplegó), el del código
       manda: es el que corresponde a las fotos que están publicadas. Los ajustes
       y el muro de entregas sí se toman de la nube, que es donde los editó el
       dueño. */
    const delCodigo = estado.huellaCatalogo !== CATALOG_FINGERPRINT;
    const inventario = delCodigo ? INITIAL_SNEAKERS : validateSneakers(estado.sneakers);
    const pares = inventario.length ? inventario : INITIAL_SNEAKERS;
    const entregas = validateDeliveries(estado.deliveries);
    const ajustes = validateSettings(estado.settings, datosRef.current.settings);

    setSneakersState(pares);
    setDeliveriesState(entregas);
    setSettingsState(ajustes);

    baseRef.current = estado.actualizadoEn;
    ultimoEnviadoRef.current = JSON.stringify(borradorDe(pares, entregas, ajustes));
    // Lo que acaba de llegar no es un cambio local: el reloj se pone a la par
    // para que no quede marcado como pendiente de publicar.
    escribirSelloLocal(estado.actualizadoEn);
  }, []);

  const publicarAhora = useCallback(async function publicar(): Promise<boolean> {
    const token = leeToken();
    if (!token) return false;

    /* Si ya hay una subida en curso, esta se anota para el final. Sin esto, un
       cambio hecho mientras subía el anterior se quedaba sin publicar hasta el
       siguiente, y el panel decía que todo estaba al día. */
    if (enviandoRef.current) {
      repetirRef.current = true;
      return false;
    }

    enviandoRef.current = true;
    setNube((prev) => ({ ...prev, sincronizando: true, mensaje: null }));
    try {
      const { sneakers: pares, deliveries: entregas, settings: ajustes } =
        datosRef.current;
      /* Se anota el reloj de partida para saber, al terminar, si el dueño editó
         algo mientras subía. */
      const selloAlEnviar = leerSelloLocal();

      /* Las fotos subidas desde el dispositivo se guardan aparte y en el
         documento queda su URL: incrustadas no cabrían en una sola petición. */
      const { borrador, subidas } = await subirFotos(
        borradorDe(pares, entregas, ajustes),
        token,
      );

      const serializado = JSON.stringify(borrador);
      if (serializado === ultimoEnviadoRef.current) {
        setNube((prev) => ({ ...prev, sincronizando: false, pendiente: false }));
        return true;
      }

      const resultado = await guardarEstado(borrador, baseRef.current, token);
      if (!resultado.ok) {
        setNube((prev) => ({
          ...prev,
          sincronizando: false,
          pendiente: true,
          mensaje: resultado.mensaje,
        }));
        return false;
      }

      baseRef.current = resultado.actualizadoEn;
      ultimoEnviadoRef.current = serializado;

      /* El reloj local se pone a la par solo si nadie editó durante la subida. Si
         editó, ese cambio todavía está por publicar —lo hace `repetirRef`— y su
         sello tiene que sobrevivir: si lo pisáramos, una recarga en ese momento
         daría la nube por más nueva y se perdería la última edición. */
      const editoMientrasSubia = leerSelloLocal() !== selloAlEnviar;
      if (!editoMientrasSubia) escribirSelloLocal(resultado.actualizadoEn);

      /* Con las fotos ya en el almacén, el navegador se queda con las URLs en vez
         de los megas en base64. Es lo que antes llenaba la cuota. */
      if (subidas) {
        setSneakersState(borrador.sneakers);
        setDeliveriesState(borrador.deliveries);
        setSettingsState((prev) => ({ ...prev, ...borrador.settings }));
      }

      setNube({
        modo: 'lista',
        sincronizando: false,
        // Si editó mientras subía, sigue pendiente hasta que salga la repetición.
        pendiente: editoMientrasSubia,
        actualizadoEn: resultado.actualizadoEn,
        mensaje: null,
      });
      return true;
    } catch (error) {
      setNube((prev) => ({
        ...prev,
        sincronizando: false,
        pendiente: true,
        mensaje:
          error instanceof Error
            ? error.message
            : 'No se pudo publicar en la nube.',
      }));
      return false;
    } finally {
      enviandoRef.current = false;
      if (repetirRef.current) {
        repetirRef.current = false;
        void publicar();
      }
    }
  }, []);

  const traerDeLaNube = useCallback(async (): Promise<boolean> => {
    setNube((prev) => ({ ...prev, sincronizando: true, mensaje: null }));
    const lectura = await leerEstado(Boolean(leeToken()));

    if (lectura.tipo === 'estado') {
      aplicarNube(lectura.estado);
      setNube({
        modo: 'lista',
        sincronizando: false,
        pendiente: false,
        actualizadoEn: lectura.estado.actualizadoEn,
        mensaje: null,
      });
      return true;
    }

    setNube((prev) => ({
      ...prev,
      sincronizando: false,
      mensaje:
        lectura.tipo === 'vacia'
          ? 'En la nube todavía no hay nada publicado.'
          : lectura.tipo === 'sin-nube'
            ? 'Este sitio no tiene nube configurada.'
            : 'No se pudo leer la nube. Revisa tu conexión.',
    }));
    return false;
  }, [aplicarNube]);

  /**
   * Trae lo último publicado si hay algo nuevo, sin pisar nada.
   *
   * Es la parte de "en vivo" que le faltaba: sin esto, un cambio hecho en el
   * computador no aparecía en el celular que ya tenía el sitio abierto hasta
   * recargar a mano.
   */
  const refrescarDesdeNube = useCallback(async () => {
    if (enviandoRef.current || repetirRef.current) return;
    /* Con cambios propios sin publicar no se trae nada: el dueño los perdería
       sin haber pedido nada. Los publica el ciclo normal y ahí se igualan. */
    const sello = leerSelloLocal();
    if (sello && sello > baseRef.current) return;
    // Un cambio de pestaña de ida y vuelta no debe convertirse en dos consultas.
    if (Date.now() - ultimoRefrescoRef.current < 5000) return;
    ultimoRefrescoRef.current = Date.now();

    const lectura = await leerEstado(Boolean(leeToken()));
    if (lectura.tipo !== 'estado') return;
    if (lectura.estado.actualizadoEn === baseRef.current) return;

    aplicarNube(lectura.estado);
    setNube((prev) => ({
      ...prev,
      pendiente: false,
      actualizadoEn: lectura.estado.actualizadoEn,
      mensaje: null,
    }));
  }, [aplicarNube]);

  /* Volver a la pestaña o a la ventana revisa si hay algo nuevo publicado. No se
     consulta en un temporizador a propósito: nadie mira una pestaña que no está
     al frente, y así el sitio no despierta la función cada minuto por cada
     visitante que lo dejó abierto. */
  useEffect(() => {
    if (nube.modo !== 'lista') return;

    const alVolver = () => {
      if (document.visibilityState !== 'visible') return;
      void refrescarDesdeNube();
    };

    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);
    return () => {
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
    };
  }, [nube.modo, refrescarDesdeNube]);

  /* Al arrancar, la nube manda: es la copia que comparten todos los equipos y
     todos los visitantes. Lo guardado en este navegador solo se conserva si es
     posterior a lo publicado, y en ese caso queda pendiente de subir. */
  useEffect(() => {
    let vivo = true;

    void (async () => {
      const lectura = await leerEstado(Boolean(leeToken()));
      if (!vivo) return;
      // Cuenta como consulta: entrar y tocar la ventana no debe pedir dos veces.
      ultimoRefrescoRef.current = Date.now();

      if (lectura.tipo === 'sin-nube') {
        setNube({
          modo: 'sin-nube',
          sincronizando: false,
          pendiente: false,
          actualizadoEn: null,
          mensaje: null,
        });
        return;
      }

      if (lectura.tipo === 'sin-red') {
        setNube({
          modo: 'lista',
          sincronizando: false,
          pendiente: Boolean(leerSelloLocal()),
          actualizadoEn: null,
          mensaje:
            'No se pudo leer la nube. Se está trabajando con la copia de este navegador.',
        });
        return;
      }

      if (lectura.tipo === 'vacia') {
        setNube({
          modo: 'lista',
          sincronizando: false,
          // Hay catálogo local y nada publicado: al entrar al panel se sube.
          pendiente: true,
          actualizadoEn: null,
          mensaje: null,
        });
        return;
      }

      const sello = leerSelloLocal();
      const nubeGana = !sello || sello <= lectura.estado.actualizadoEn;
      if (nubeGana) aplicarNube(lectura.estado);
      else baseRef.current = lectura.estado.actualizadoEn;

      setNube({
        modo: 'lista',
        sincronizando: false,
        pendiente: !nubeGana,
        actualizadoEn: lectura.estado.actualizadoEn,
        mensaje: nubeGana
          ? null
          : 'Este navegador tiene cambios más nuevos que la nube. Se publican al entrar al panel.',
      });
    })();

    return () => {
      vivo = false;
    };
  }, [aplicarNube]);

  /* Publicación automática: todo cambio del panel sube solo, con un margen para
     no mandar una versión por tecla. Sin token no se intenta —un visitante no
     escribe nada— y el aviso de "sin publicar" ya lo puso `sellarCambioLocal`. */
  useEffect(() => {
    if (nube.modo !== 'lista') return;
    if (!leeToken()) return;

    const temporizador = setTimeout(() => {
      void publicarAhora();
    }, RETARDO_PUBLICACION_MS);
    return () => clearTimeout(temporizador);
  }, [sneakers, deliveries, settings, nube.modo, publicarAhora]);

  const setSneakers = useCallback(
    (next: Sneaker[]) => {
      setSneakersState(next);
      sellarCambioLocal();
    },
    [sellarCambioLocal],
  );

  const setSettings = useCallback(
    (next: StoreSettings) => {
      setSettingsState(next);
      sellarCambioLocal();
    },
    [sellarCambioLocal],
  );

  const upsertSneaker = useCallback(
    (sneaker: Sneaker) => {
      setSneakersState((prev) => {
        const exists = prev.some((s) => s.id === sneaker.id);
        return exists
          ? prev.map((s) => (s.id === sneaker.id ? sneaker : s))
          : [sneaker, ...prev];
      });
      sellarCambioLocal();
    },
    [sellarCambioLocal],
  );

  const patchSneaker = useCallback(
    (id: string, patch: Partial<Sneaker>) => {
      setSneakersState((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s,
        ),
      );
      sellarCambioLocal();
    },
    [sellarCambioLocal],
  );

  /* Borrado con posibilidad de deshacer — antes era irreversible y a un clic. */
  const removeSneaker = useCallback(
    (id: string) => {
      setSneakersState((prev) => {
        const target = prev.find((s) => s.id === id) ?? null;
        setLastRemoved(target);
        return prev.filter((s) => s.id !== id);
      });
      sellarCambioLocal();
    },
    [sellarCambioLocal],
  );

  const restoreSneaker = useCallback(() => {
    setLastRemoved((removed) => {
      if (removed) setSneakersState((prev) => [removed, ...prev]);
      return null;
    });
    sellarCambioLocal();
  }, [sellarCambioLocal]);

  /* ── Entregas ─────────────────────────────────────────────────────────── */

  const setDeliveries = useCallback(
    (next: Delivery[]) => {
      setDeliveriesState(next);
      sellarCambioLocal();
    },
    [sellarCambioLocal],
  );

  const upsertDelivery = useCallback(
    (delivery: Delivery) => {
      setDeliveriesState((prev) => {
        const exists = prev.some((d) => d.id === delivery.id);
        return exists
          ? prev.map((d) => (d.id === delivery.id ? delivery : d))
          : [delivery, ...prev];
      });
      sellarCambioLocal();
    },
    [sellarCambioLocal],
  );

  const removeDelivery = useCallback(
    (id: string) => {
      setDeliveriesState((prev) => prev.filter((d) => d.id !== id));
      sellarCambioLocal();
    },
    [sellarCambioLocal],
  );

  const getSneaker = useCallback(
    (id: string) => sneakers.find((s) => s.id === id),
    [sneakers],
  );

  const resetCatalog = useCallback(() => {
    setSneakersState(INITIAL_SNEAKERS);
    setLastRemoved(null);
    sellarCambioLocal();
  }, [sellarCambioLocal]);

  const value = useMemo<StoreContextValue>(
    () => ({
      sneakers,
      settings,
      deliveries,
      setSneakers,
      setSettings,
      upsertSneaker,
      patchSneaker,
      removeSneaker,
      restoreSneaker,
      lastRemoved,
      getSneaker,
      setDeliveries,
      upsertDelivery,
      removeDelivery,
      resetCatalog,
      storageWarning,
      nube,
      publicarAhora,
      traerDeLaNube,
    }),
    [
      sneakers,
      settings,
      deliveries,
      setSneakers,
      setSettings,
      upsertSneaker,
      patchSneaker,
      removeSneaker,
      restoreSneaker,
      lastRemoved,
      getSneaker,
      setDeliveries,
      upsertDelivery,
      removeDelivery,
      resetCatalog,
      storageWarning,
      nube,
      publicarAhora,
      traerDeLaNube,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore debe usarse dentro de <StoreProvider>.');
  return ctx;
}
