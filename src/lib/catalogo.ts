/**
 * Cómo conviven el catálogo del código y lo que el dueño hace en el panel.
 *
 * El catálogo generado (`npm run catalogo`) es el punto de partida, pero el
 * panel también agrega pares, quita otros y corrige los que quedaron mal. Antes,
 * al regenerar el catálogo y desplegar, lo guardado se botaba entero: volvían
 * los pares quitados y desaparecían los cargados desde el panel. Aquí está la
 * regla que lo reemplaza —el panel manda sobre lo suyo, el código aporta el
 * resto— y todo lo que hace falta para sostenerla.
 *
 * Son funciones puras a propósito: `StoreContext` las usa tanto al leer el
 * `localStorage` como al recibir el documento de la nube.
 */
import type { CatalogDecisions, Sneaker } from '../types';
import { INITIAL_SNEAKERS } from '../data/initialData';

export const SIN_DECISIONES: CatalogDecisions = { hiddenIds: [], editedIds: [] };

/**
 * Firma de un par: todo lo que se puede cambiar desde el panel.
 *
 * No se comparan los objetos enteros porque el orden de las llaves no coincide
 * entre el archivo generado y lo que devuelve el validador, y dos pares iguales
 * darían distinto. Quedan fuera `createdAt`, `updatedAt` y los contadores:
 * cambian en cada corrida del generador sin que nadie haya editado nada.
 */
export function firmaPar(s: Sneaker): string {
  const d = s.details;
  return [
    s.id,
    s.name,
    s.brand,
    s.model,
    s.sku,
    s.category,
    s.gender ?? '',
    s.price,
    s.originalPrice ?? '',
    s.sizes.join(','),
    s.images.join(','),
    s.status,
    s.isFeatured,
    s.isNewArrival,
    s.description,
    d.condition,
    d.colorway,
    d.includedItems.join(','),
    d.releaseYear ?? '',
    d.qualityBadge ?? '',
    d.authenticityNotes ?? '',
  ].join('|');
}

/**
 * Huella del catálogo que viene en el código.
 *
 * Existe para resolver el problema de siempre: el inventario guardado le gana al
 * del código, así que después de `npm run catalogo` el dueño no veía sus fotos
 * nuevas y tenía que hacer `localStorage.clear()` a mano —lo que también le
 * borraba los ajustes de la tienda—.
 *
 * Se calcula sola a partir de los pares generados, así que no hay ningún número
 * que acordarse de subir. La misma huella viaja al documento de la nube: cuando
 * deja de calzar, `fusionaConCodigo` decide par por par quién manda.
 */
function calculaHuella(): string {
  let hash = 0;
  for (const s of INITIAL_SNEAKERS) {
    const firma = firmaPar(s);
    for (let i = 0; i < firma.length; i++) {
      hash = (Math.imul(hash, 31) + firma.charCodeAt(i)) | 0;
    }
  }
  return `${INITIAL_SNEAKERS.length}-${(hash >>> 0).toString(36)}`;
}

/* El catálogo del código no cambia en tiempo de ejecución: se calcula una vez. */
export const HUELLA_CATALOGO = calculaHuella();

/** Firma de cada par del código, por id: la referencia de "esto no lo tocaron". */
const FIRMAS_DEL_CODIGO = new Map(INITIAL_SNEAKERS.map((s) => [s.id, firmaPar(s)]));

/** ¿Este par salió del catálogo generado, o lo creó el dueño en el panel? */
export function vieneDelCodigo(id: string): boolean {
  return FIRMAS_DEL_CODIGO.has(id);
}

/**
 * Qué le hizo el panel al catálogo del código.
 *
 * Se deduce comparando contra el código, y por eso se guarda en el momento de
 * editar, que es cuando la comparación vale: después de `npm run catalogo` el
 * par del código ya es otro y "distinto" dejaría de significar "lo editó el
 * dueño".
 */
export function decisionesDe(pares: Sneaker[]): CatalogDecisions {
  const presentes = new Set(pares.map((s) => s.id));
  return {
    hiddenIds: [...FIRMAS_DEL_CODIGO.keys()].filter((id) => !presentes.has(id)),
    editedIds: pares
      .filter((s) => {
        const firma = FIRMAS_DEL_CODIGO.get(s.id);
        return firma !== undefined && firma !== firmaPar(s);
      })
      .map((s) => s.id),
  };
}

/**
 * Junta lo guardado con el catálogo del código cuando ya no son el mismo
 * catálogo, es decir cuando se corrió `npm run catalogo` y se desplegó.
 *
 * El panel conserva lo suyo —lo que creó, lo que quitó y lo que editó— y el
 * código aporta el resto: los pares nuevos y las fotos corregidas de los que
 * nadie tocó, que es para lo que se regenera el catálogo.
 */
export function fusionaConCodigo(
  guardados: Sneaker[],
  decisiones: CatalogDecisions,
): Sneaker[] {
  const guardadoPorId = new Map(guardados.map((s) => [s.id, s]));
  const ocultos = new Set(decisiones.hiddenIds);
  const editados = new Set(decisiones.editedIds);

  const delCodigo = INITIAL_SNEAKERS.filter((s) => !ocultos.has(s.id)).map((s) =>
    editados.has(s.id) ? (guardadoPorId.get(s.id) ?? s) : s,
  );

  /* Los pares creados en el panel van primero: es donde los deja `upsertSneaker`
     y donde el dueño espera encontrarlos al abrir el catálogo. */
  const propios = guardados.filter((s) => !vieneDelCodigo(s.id));
  return [...propios, ...delCodigo];
}
