/**
 * El documento que se publica en la nube, y su saneamiento.
 *
 * Nada de lo que llega del navegador se guarda tal cual: el catálogo, el muro
 * de entregas y las historias pasan por los mismos validadores que ya cuidan la
 * importación de respaldos, así que una petición armada a mano no puede meter
 * una URL `javascript:` ni desviar el número de WhatsApp.
 *
 * Las credenciales del panel NO viajan aquí. El usuario y el hash del PIN se
 * quedan en el navegador del dueño y en las variables de entorno; publicarlos
 * sería repartirlos, porque este documento lo lee cualquier visitante.
 */
import type { Delivery, Sneaker, StoreSettings } from '../../src/types';
import {
  validateDeliveries,
  validateSlides,
  validateSneakers,
} from '../../src/lib/validation';
import { sanitizeText } from '../../src/lib/security';

export const RUTA_ESTADO = 'estado.json';

/** Tope del documento. El cuerpo de una función de Vercel no pasa de 4.5 MB. */
export const TOPE_BYTES = 3_500_000;

/** Los ajustes tal como se publican: los mismos de la tienda, sin credenciales. */
export type AjustesPublicados = Partial<
  Omit<StoreSettings, 'adminUsername' | 'adminPinHash'>
>;

export interface EstadoPublicado {
  version: 1;
  /** Cuándo se guardó. Es la referencia con la que se detectan los conflictos. */
  actualizadoEn: string;
  /**
   * Huella del catálogo del código con el que se guardó. Si el sitio se
   * despliega con fotos nuevas (`npm run catalogo`), la huella deja de calzar y
   * el inventario del código vuelve a mandar, igual que ya pasaba con el
   * `localStorage`.
   */
  huellaCatalogo: string;
  sneakers: Sneaker[];
  deliveries: Delivery[];
  settings: AjustesPublicados;
}

type ClaveTexto =
  | 'storeName'
  | 'tagline'
  | 'slogan'
  | 'whatsappMessageTemplate'
  | 'announcement'
  | 'instagramHandle'
  | 'tiktokHandle'
  | 'locationCity'
  | 'guaranteeText';

const TEXTOS: { clave: ClaveTexto; tope: number }[] = [
  { clave: 'storeName', tope: 60 },
  { clave: 'tagline', tope: 80 },
  { clave: 'slogan', tope: 120 },
  { clave: 'whatsappMessageTemplate', tope: 600 },
  { clave: 'announcement', tope: 240 },
  { clave: 'instagramHandle', tope: 40 },
  { clave: 'tiktokHandle', tope: 40 },
  { clave: 'locationCity', tope: 120 },
  { clave: 'guaranteeText', tope: 240 },
];

const MONEDAS: StoreSettings['currency'][] = ['COP', 'USD', 'MXN', 'EUR'];

/**
 * Sanea los ajustes campo por campo y descarta lo que no reconoce.
 *
 * No completa valores de fábrica a propósito: los que falten los pone el
 * navegador al leer, con `validateSettings` y sus propios ajustes iniciales.
 * Así el servidor no tiene que cargar una copia del catálogo del código.
 */
function saneaAjustes(raw: unknown): AjustesPublicados {
  if (!raw || typeof raw !== 'object') return {};
  const entrada = raw as Record<string, unknown>;
  const salida: AjustesPublicados = {};

  for (const { clave, tope } of TEXTOS) {
    const valor = sanitizeText(entrada[clave], tope);
    if (valor) salida[clave] = valor;
  }

  const telefono = sanitizeText(entrada.whatsappNumber, 20).replace(/\D/g, '');
  if (/^\d{10,15}$/.test(telefono)) salida.whatsappNumber = telefono;

  const moneda = MONEDAS.find((m) => m === entrada.currency);
  if (moneda) {
    salida.currency = moneda;
    // El símbolo se deduce, no se acepta: es presentación, no dato de entrada.
    salida.currencySymbol = moneda === 'EUR' ? '€' : '$';
  }

  if (typeof entrada.showAnnouncement === 'boolean') {
    salida.showAnnouncement = entrada.showAnnouncement;
  }

  if (Array.isArray(entrada.shippingSlides)) {
    salida.shippingSlides = validateSlides(entrada.shippingSlides);
  }
  if (Array.isArray(entrada.promoSlides)) {
    salida.promoSlides = validateSlides(entrada.promoSlides);
  }
  if (Array.isArray(entrada.reviewSlides)) {
    salida.reviewSlides = validateSlides(entrada.reviewSlides);
  }

  return salida;
}

export function saneaEstado(raw: unknown, actualizadoEn: string): EstadoPublicado {
  const entrada = (raw ?? {}) as Record<string, unknown>;
  return {
    version: 1,
    actualizadoEn,
    huellaCatalogo: sanitizeText(entrada.huellaCatalogo, 40),
    sneakers: validateSneakers(entrada.sneakers),
    deliveries: validateDeliveries(entrada.deliveries),
    settings: saneaAjustes(entrada.settings),
  };
}
