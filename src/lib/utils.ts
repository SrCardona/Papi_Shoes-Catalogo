import type { Sneaker, StoreSettings } from '../types';

/* ── Precio ─────────────────────────────────────────────────────────────── */

const LOCALES: Record<string, string> = {
  COP: 'es-CO',
  USD: 'en-US',
  MXN: 'es-MX',
  EUR: 'de-DE',
};

export function formatPrice(
  price: number,
  currency = 'COP',
  symbol = '$',
): string {
  const locale = LOCALES[currency] ?? 'es-CO';
  const amount = price.toLocaleString(locale, { maximumFractionDigits: 0 });
  return currency === 'EUR' ? `${amount} €` : `${symbol}${amount}`;
}

export function discountPercent(sneaker: Sneaker): number | null {
  if (!sneaker.originalPrice || sneaker.originalPrice <= sneaker.price) return null;
  return Math.round(
    ((sneaker.originalPrice - sneaker.price) / sneaker.originalPrice) * 100,
  );
}

/* ── WhatsApp ────────────────────────────────────────────────────────────
   En la versión anterior estas funciones ignoraban todos sus parámetros y
   devolvían siempre el mismo enlace fijo, así que el cliente llegaba al chat
   sin decir qué par quería. Ahora la plantilla se interpola de verdad.      */

const TEMPLATE_VARS = ['{modelo}', '{talla}', '{precio}', '{categoria}'] as const;

/**
 * Enlace a wa.me con el número reducido a dígitos y el mensaje ya codificado.
 * Se exporta para los casos en que el texto va literal —la fila de historias,
 * por ejemplo— y no debe pasar por la plantilla de producto ni por el saludo
 * que antepone `generateDirectWhatsAppContact`.
 */
export function waHref(number: string, message: string): string {
  const clean = number.replace(/\D/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export function generateWhatsAppLink(
  sneaker: Sneaker,
  selectedSize: string | number | null,
  settings: StoreSettings,
): string {
  const size = selectedSize ? String(selectedSize) : 'por confirmar';
  const category =
    sneaker.category === 'originales'
      ? '100% Original · Legit Check'
      : 'Línea Sneakers';

  const values: Record<(typeof TEMPLATE_VARS)[number], string> = {
    '{modelo}': sneaker.name,
    '{talla}': size,
    '{precio}': formatPrice(sneaker.price, settings.currency, settings.currencySymbol),
    '{categoria}': category,
  };

  const message = TEMPLATE_VARS.reduce(
    (text, key) => text.split(key).join(values[key]),
    settings.whatsappMessageTemplate,
  );

  return waHref(settings.whatsappNumber, message);
}

export function generateDirectWhatsAppContact(
  settings: StoreSettings,
  topic?: string,
): string {
  const message = topic
    ? `¡Hola ${settings.storeName}! 👋 Quiero consultar sobre: ${topic}`
    : `¡Hola ${settings.storeName}! 👋 Quiero información sobre el catálogo.`;
  return waHref(settings.whatsappNumber, message);
}

/* ── Redes ──────────────────────────────────────────────────────────────── */

/**
 * Perfil de Instagram, o `null` si no hay usuario configurado. Devuelve `null`
 * en vez de una cadena para que quien lo llame no pueda dibujar un enlace a
 * `instagram.com/` sin usuario. Se acepta el usuario con o sin arroba, porque
 * el dueño lo escribe de las dos formas.
 */
export function instagramUrl(handle: string): string | null {
  const clean = handle.trim().replace(/^@+/, '');
  if (!clean) return null;
  return `https://instagram.com/${encodeURIComponent(clean)}`;
}

/** Número en formato legible: 573045961031 → +57 304 596 1031 */
export function formatPhoneDisplay(number: string): string {
  const d = number.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('57')) {
    return `+57 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  }
  return `+${d}`;
}

/* ── Archivos ───────────────────────────────────────────────────────────── */

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
/** Tope para las fotos que sí se recomprimen antes de guardarse. */
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error(`"${file.name}" no es una imagen.`));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error(`"${file.name}" pesa más de 3 MB. Comprímela antes de subirla.`));
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`No se pudo leer "${file.name}".`));
  });
}

/**
 * Reduce y recomprime una foto antes de guardarla.
 *
 * Una foto de celular pesa entre 3 y 8 MB; en base64 crece otro 33% y el
 * navegador solo da ~5 MB de localStorage en total. Con esto una entrega
 * queda en 150–300 KB y caben cientos sin reventar la cuota. Si el navegador
 * no puede usar canvas, devuelve el original en vez de fallar.
 */
export async function compressImageFile(
  file: File,
  maxEdge = 1400,
  quality = 0.72,
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`"${file.name}" no es una imagen.`);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `"${file.name}" pesa más de 15 MB. Tómale una captura o redúcela antes de subirla.`,
    );
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`No se pudo leer "${file.name}".`));
  });

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('imagen ilegible'));
      img.src = dataUrl;
    });

    const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const compressed = canvas.toDataURL('image/jpeg', quality);
    // Si la recompresión no ayudó (PNG plano, imagen ya diminuta), nos
    // quedamos con la original.
    return compressed.length < dataUrl.length ? compressed : dataUrl;
  } catch {
    return dataUrl;
  }
}

/* ── Fechas ─────────────────────────────────────────────────────────────── */

/**
 * "Agosto 2026". Se fuerza UTC porque los <input type="date"> entregan
 * medianoche UTC y, en Colombia (−05), formatear en hora local retrocedería
 * un día — y con él, a veces, el mes.
 */
export function formatMonthYear(iso: string, locale = 'es-CO'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const text = date.toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** ISO → 'YYYY-MM-DD' para rellenar un <input type="date">. */
export function toDateInputValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

/* ── Varios ─────────────────────────────────────────────────────────────── */

export const cx = (...classes: (string | false | null | undefined)[]): string =>
  classes.filter(Boolean).join(' ');

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
