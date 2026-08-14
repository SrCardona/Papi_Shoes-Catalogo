/**
 * Validación de respaldos importados.
 *
 * Antes, "Restaurar desde archivo JSON" confiaba en el archivo tal cual, así
 * que un JSON preparado podía inyectar URLs `javascript:` o cambiar el número
 * de WhatsApp para desviar los pedidos. Ahora cada campo se verifica y se
 * normaliza contra el modelo de datos antes de entrar a la aplicación.
 */

import type {
  Delivery,
  Sneaker,
  SneakerBrand,
  SneakerCategory,
  SneakerGender,
  SneakerStatus,
  StoreSettings,
  StorySlide,
} from '../types';
import { sanitizeImageUrl, sanitizeText, uuid } from './security';

const BRANDS: SneakerBrand[] = [
  'Nike',
  'Jordan',
  'Adidas',
  'Yeezy',
  'New Balance',
  'Travis Scott',
  'Off-White',
  'Louis Vuitton',
  'Calvin Klein',
  'Hugo Boss',
  'Guess',
  'Puma',
  'Asics',
  'Otras',
];
const CATEGORIES: SneakerCategory[] = ['originales', 'general'];
const STATUSES: SneakerStatus[] = ['disponible', 'bajo_encargo', 'agotado'];
const GENDERS: SneakerGender[] = ['hombre', 'mujer', 'unisex'];
const CURRENCIES = ['COP', 'USD', 'MXN', 'EUR'] as const;

function pick<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function toPrice(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000_000) return fallback;
  return Math.round(n);
}

function toIsoDate(value: unknown): string {
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

export function validateSneaker(raw: unknown): Sneaker | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, any>;

  const name = sanitizeText(s.name, 140);
  if (!name) return null;

  const images = Array.isArray(s.images)
    ? s.images.slice(0, 12).map(sanitizeImageUrl)
    : [];

  const sizes = Array.isArray(s.sizes)
    ? s.sizes
        .slice(0, 30)
        .map((x: unknown) => (typeof x === 'number' ? x : sanitizeText(x, 6)))
        .filter(Boolean)
    : [];

  const details = (s.details ?? {}) as Record<string, any>;
  const category = pick(s.category, CATEGORIES, 'general');

  return {
    id: sanitizeText(s.id, 80) || `sneaker-${uuid()}`,
    name,
    brand: pick(s.brand, BRANDS, 'Otras'),
    model: sanitizeText(s.model, 140) || name,
    sku: sanitizeText(s.sku, 40) || '—',
    category,
    gender: pick(s.gender, GENDERS, 'unisex'),
    price: toPrice(s.price),
    originalPrice: s.originalPrice ? toPrice(s.originalPrice) : undefined,
    images: images.length ? images : [sanitizeImageUrl(null)],
    sizes: sizes.length ? sizes : [39, 40, 41, 42, 43],
    status: pick(s.status, STATUSES, 'disponible'),
    isFeatured: Boolean(s.isFeatured),
    isNewArrival: Boolean(s.isNewArrival),
    isOriginalCertified: category === 'originales',
    description: sanitizeText(s.description, 1200),
    details: {
      condition: sanitizeText(details.condition, 160) || 'Nuevo en caja',
      colorway: sanitizeText(details.colorway, 160),
      includedItems: Array.isArray(details.includedItems)
        ? details.includedItems.slice(0, 12).map((i: unknown) => sanitizeText(i, 120)).filter(Boolean)
        : [],
      releaseYear:
        Number.isInteger(details.releaseYear) &&
        details.releaseYear > 1970 &&
        details.releaseYear < 2100
          ? details.releaseYear
          : undefined,
      qualityBadge: sanitizeText(details.qualityBadge, 80) || undefined,
      authenticityNotes: sanitizeText(details.authenticityNotes, 400) || undefined,
    },
    viewsCount: Number.isFinite(Number(s.viewsCount)) ? Number(s.viewsCount) : 0,
    inquiriesCount: Number.isFinite(Number(s.inquiriesCount)) ? Number(s.inquiriesCount) : 0,
    createdAt: toIsoDate(s.createdAt),
    updatedAt: toIsoDate(s.updatedAt),
  };
}

export function validateSneakers(raw: unknown): Sneaker[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 500)
    .map(validateSneaker)
    .filter((s): s is Sneaker => s !== null);
}

/* ── Entregas ────────────────────────────────────────────────────────────
   Mismo criterio que el inventario: la foto pasa por `sanitizeImageUrl` y
   todo texto por `sanitizeText`, para que un respaldo manipulado no pueda
   inyectar nada en el muro público.                                        */

export function validateDelivery(raw: unknown): Delivery | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, any>;

  const city = sanitizeText(d.city, 60);
  if (!city) return null;

  return {
    id: sanitizeText(d.id, 80) || `entrega-${uuid()}`,
    image: sanitizeImageUrl(d.image),
    city,
    neighborhood: sanitizeText(d.neighborhood, 80),
    productName: sanitizeText(d.productName, 140) || undefined,
    note: sanitizeText(d.note, 240) || undefined,
    deliveredAt: toIsoDate(d.deliveredAt),
    locationInImage: Boolean(d.locationInImage),
    createdAt: toIsoDate(d.createdAt),
  };
}

export function validateDeliveries(raw: unknown): Delivery[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 300)
    .map(validateDelivery)
    .filter((d): d is Delivery => d !== null);
}

/* ── Diapositivas de las historias ───────────────────────────────────────
   Van dentro de los ajustes, así que entran por el mismo archivo de respaldo
   y merecen el mismo trato que el muro: la foto por `sanitizeImageUrl` y los
   textos por `sanitizeText`. Una diapositiva sin foto se descarta, porque el
   visor la mostraría en negro.                                              */

function validateSlide(raw: unknown): StorySlide | null {
  if (!raw || typeof raw !== 'object') return null;
  // `unknown` y no `any`: los saneadores ya aceptan lo que sea y descartan lo
  // que no sea texto, así que no hace falta apagar el tipado aquí.
  const s = raw as Record<string, unknown>;

  const image = sanitizeImageUrl(s.image);
  // `sanitizeImageUrl` devuelve un SVG de marcador cuando la URL no sirve.
  if (!image || image.startsWith('data:image/svg')) return null;

  return {
    image,
    caption: sanitizeText(s.caption, 240),
    title: sanitizeText(s.title, 80) || undefined,
    ctaText: sanitizeText(s.ctaText, 40) || undefined,
    badge: sanitizeText(s.badge, 40) || undefined,
  };
}

export function validateSlides(raw: unknown): StorySlide[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 30)
    .map(validateSlide)
    .filter((s): s is StorySlide => s !== null);
}

/**
 * Valida ajustes importados. `current` aporta los valores de respaldo, y las
 * credenciales NUNCA se toman del archivo: un respaldo no puede reescribir
 * quién tiene acceso al panel.
 */
export function validateSettings(
  raw: unknown,
  current: StoreSettings,
): StoreSettings {
  if (!raw || typeof raw !== 'object') return current;
  const s = raw as Record<string, any>;

  const phone = sanitizeText(s.whatsappNumber, 20).replace(/\D/g, '');
  const currency = pick(s.currency, [...CURRENCIES], current.currency);

  return {
    ...current,
    storeName: sanitizeText(s.storeName, 60) || current.storeName,
    tagline: sanitizeText(s.tagline, 80) || current.tagline,
    slogan: sanitizeText(s.slogan, 120) || current.slogan,
    whatsappNumber: /^\d{10,15}$/.test(phone) ? phone : current.whatsappNumber,
    whatsappMessageTemplate:
      sanitizeText(s.whatsappMessageTemplate, 600) || current.whatsappMessageTemplate,
    currency,
    currencySymbol: currency === 'EUR' ? '€' : '$',
    announcement: sanitizeText(s.announcement, 240) || current.announcement,
    showAnnouncement:
      typeof s.showAnnouncement === 'boolean'
        ? s.showAnnouncement
        : current.showAnnouncement,
    instagramHandle: sanitizeText(s.instagramHandle, 40) || current.instagramHandle,
    tiktokHandle: sanitizeText(s.tiktokHandle, 40) || current.tiktokHandle,
    locationCity: sanitizeText(s.locationCity, 120) || current.locationCity,
    guaranteeText: sanitizeText(s.guaranteeText, 240) || current.guaranteeText,
    // Un respaldo sin historias no debe vaciar las que ya están cargadas.
    shippingSlides: Array.isArray(s.shippingSlides)
      ? validateSlides(s.shippingSlides)
      : current.shippingSlides,
    promoSlides: Array.isArray(s.promoSlides)
      ? validateSlides(s.promoSlides)
      : current.promoSlides,
    reviewSlides: Array.isArray(s.reviewSlides)
      ? validateSlides(s.reviewSlides)
      : current.reviewSlides,
    // Credenciales preservadas a propósito — ver comentario superior.
    adminUsername: current.adminUsername,
    adminPinHash: current.adminPinHash,
  };
}
