import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

const INVENTORY_KEY = 'papi_shoes_inventory';
const SETTINGS_KEY = 'papi_shoes_settings';
const DELIVERIES_KEY = 'papi_shoes_deliveries';
const CATALOG_VERSION_KEY = 'papi_shoes_catalog_version';

/**
 * Huella del catálogo que viene en el código.
 *
 * Existe para resolver el problema de siempre: el inventario del navegador le
 * gana al del código, así que después de `npm run catalogo` el dueño no veía
 * sus fotos nuevas y tenía que hacer `localStorage.clear()` a mano —lo que
 * también le borraba los ajustes de la tienda—.
 *
 * Se calcula sola a partir de los pares generados, así que no hay ningún
 * número que acordarse de subir. Se dejan fuera `createdAt` y `updatedAt` a
 * propósito: cambian en cada corrida del generador, y sin excluirlos una
 * regeneración que no cambió nada borraría las ediciones hechas en el panel.
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

export function StoreProvider({ children }: { children: ReactNode }) {
  const [sneakers, setSneakersState] = useState<Sneaker[]>(loadInventory);
  const [deliveries, setDeliveriesState] = useState<Delivery[]>(loadDeliveries);
  const [settings, setSettingsState] = useState<StoreSettings>(loadSettings);
  const [lastRemoved, setLastRemoved] = useState<Sneaker | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  /* Persistencia. Si se supera la cuota del navegador avisamos en vez de
     fallar en silencio, que es lo que hacía la versión anterior.          */
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
        'El navegador se quedó sin espacio. Exporta un respaldo, borra entregas antiguas o usa imágenes por URL en vez de subirlas desde el dispositivo.';
    }
    // Escribir en localStorage es sincronización con un sistema externo, y su
    // fallo debe llegar al usuario: sin aviso, perdería trabajo sin enterarse.
    // El actualizador solo cambia el estado si el resultado es distinto, así
    // que no encadena renders en cada guardado.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStorageWarning((current) => (current === failure ? current : failure));
  }, [sneakers, deliveries]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* los ajustes son pequeños; si esto falla ya lo reporta el aviso de arriba */
    }
  }, [settings]);

  const setSneakers = useCallback((next: Sneaker[]) => setSneakersState(next), []);
  const setSettings = useCallback((next: StoreSettings) => setSettingsState(next), []);

  const upsertSneaker = useCallback((sneaker: Sneaker) => {
    setSneakersState((prev) => {
      const exists = prev.some((s) => s.id === sneaker.id);
      return exists
        ? prev.map((s) => (s.id === sneaker.id ? sneaker : s))
        : [sneaker, ...prev];
    });
  }, []);

  const patchSneaker = useCallback((id: string, patch: Partial<Sneaker>) => {
    setSneakersState((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s,
      ),
    );
  }, []);

  /* Borrado con posibilidad de deshacer — antes era irreversible y a un clic. */
  const removeSneaker = useCallback((id: string) => {
    setSneakersState((prev) => {
      const target = prev.find((s) => s.id === id) ?? null;
      setLastRemoved(target);
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  const restoreSneaker = useCallback(() => {
    setLastRemoved((removed) => {
      if (removed) setSneakersState((prev) => [removed, ...prev]);
      return null;
    });
  }, []);

  /* ── Entregas ─────────────────────────────────────────────────────────── */

  const setDeliveries = useCallback(
    (next: Delivery[]) => setDeliveriesState(next),
    [],
  );

  const upsertDelivery = useCallback((delivery: Delivery) => {
    setDeliveriesState((prev) => {
      const exists = prev.some((d) => d.id === delivery.id);
      return exists
        ? prev.map((d) => (d.id === delivery.id ? delivery : d))
        : [delivery, ...prev];
    });
  }, []);

  const removeDelivery = useCallback((id: string) => {
    setDeliveriesState((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const getSneaker = useCallback(
    (id: string) => sneakers.find((s) => s.id === id),
    [sneakers],
  );

  const resetCatalog = useCallback(() => {
    setSneakersState(INITIAL_SNEAKERS);
    setLastRemoved(null);
  }, []);

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
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore debe usarse dentro de <StoreProvider>.');
  return ctx;
}
