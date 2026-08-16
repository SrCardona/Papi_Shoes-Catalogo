export type SneakerCategory = 'originales' | 'general';
export type SneakerStatus = 'disponible' | 'bajo_encargo' | 'agotado';
export type SneakerGender = 'hombre' | 'mujer' | 'unisex';

export type SneakerBrand =
  | 'Nike'
  | 'Jordan'
  | 'Adidas'
  | 'Yeezy'
  | 'New Balance'
  | 'Travis Scott'
  | 'Off-White'
  | 'Louis Vuitton'
  | 'Calvin Klein'
  | 'Hugo Boss'
  | 'Guess'
  | 'Puma'
  | 'Asics'
  | 'Otras';

export interface SneakerDetails {
  condition: string;
  colorway: string;
  includedItems: string[];
  releaseYear?: number;
  qualityBadge?: string;
  authenticityNotes?: string;
}

export interface Sneaker {
  id: string;
  name: string;
  brand: SneakerBrand;
  model: string;
  sku: string;
  category: SneakerCategory;
  gender?: SneakerGender;
  price: number;
  originalPrice?: number;
  images: string[];
  sizes: (number | string)[];
  status: SneakerStatus;
  isFeatured: boolean;
  isNewArrival: boolean;
  isOriginalCertified: boolean;
  description: string;
  details: SneakerDetails;
  viewsCount?: number;
  inquiriesCount?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Una entrega documentada: la foto que se le toma al cliente al recibir el par.
 * La ubicación se guarda como DATO (barrio + ciudad), no solo quemada dentro
 * de la imagen: así se puede filtrar por ciudad, contar cobertura y mantener
 * la tipografía de la marca en todas las tarjetas.
 */
export interface Delivery {
  id: string;
  image: string;
  /** Ciudad de la entrega. Es lo único obligatorio junto con la foto. */
  city: string;
  /** Barrio o sector. Nunca dirección exacta. */
  neighborhood: string;
  /** Referencia entregada, opcional: "Air Jordan 1 UNC Toe". */
  productName?: string;
  /** Nota corta que acompaña la foto. */
  note?: string;
  /** Fecha de la entrega en ISO. En el sitio solo se muestra mes y año. */
  deliveredAt: string;
  /**
   * `true` cuando la foto YA trae la ubicación escrita encima. En ese caso no
   * se dibuja el rótulo del sitio para no repetir el dato dos veces.
   */
  locationInImage: boolean;
  createdAt: string;
}

export interface StorySlide {
  image: string;
  caption: string;
  title?: string;
  ctaText?: string;
  badge?: string;
}

/**
 * Qué pasa al tocar un círculo de la fila de historias.
 *
 * No todas las historias tienen algo que contar en fotos: "Catálogo" o "FAQ"
 * son atajos a una página, y "Bajo encargo" es una conversación. Abrirlas
 * todas en el visor obligaba a mirar una diapositiva antes de llegar a lo que
 * de verdad se buscaba.
 */
export type StoryBehavior =
  /** Ruta interna de la app: '/originales', '/nosotros'… */
  | { type: 'navigate'; to: string }
  /** El visor de diapositivas de siempre. */
  | { type: 'slides' }
  /** Catálogo con un filtro puesto. `filter` viaja como ?marca=… */
  | { type: 'catalog-filter'; filter: string }
  /** WhatsApp con un mensaje ya escrito, buscado por `messageKey`. */
  | { type: 'whatsapp'; messageKey: string };

export interface StoryHighlight {
  id: string;
  title: string;
  /**
   * Rótulo bajo el círculo. Existe porque el círculo mide 74px y ahí no cabe
   * un título largo: `title` se sigue usando en el visor y como texto
   * accesible. Si falta, se muestra `title`.
   */
  label?: string;
  iconName: string;
  previewImage: string;
  slides: StorySlide[];
  /** Sin definir se comporta como siempre: abre el visor de diapositivas. */
  behavior?: StoryBehavior;
}

/**
 * El flyer que se muestra al entrar a la portada.
 *
 * Es un anuncio ocasional —una fiesta, un lote que llega— y no una pieza fija
 * del sitio, así que vive en los ajustes y se prende y apaga desde el panel.
 */
export interface PopupAnnouncement {
  /**
   * Identificador del anuncio. Quien lo cierra no lo vuelve a ver, y esa
   * decisión se guarda contra este id: al publicar un flyer nuevo se cambia el
   * id y el anuncio vuelve a aparecerle a todos, incluso a los que ya cerraron
   * el anterior.
   */
  id: string;
  enabled: boolean;
  image: string;
  /** Opcional: a dónde lleva al tocar el flyer. Se abre en pestaña nueva. */
  link?: string;
  /** Qué dice el flyer, para quien no puede verlo. */
  alt: string;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  slogan: string;
  whatsappNumber: string;
  whatsappMessageTemplate: string;
  adminUsername: string;
  /** SHA-256 del PIN. Nunca se almacena el PIN en claro. */
  adminPinHash: string;
  currency: 'COP' | 'USD' | 'MXN' | 'EUR';
  currencySymbol: string;
  announcement: string;
  showAnnouncement: boolean;
  instagramHandle: string;
  tiktokHandle: string;
  locationCity: string;
  guaranteeText: string;
  /**
   * Diapositivas que el dueño administra desde Panel › Ajustes › Historias.
   * Vacías de fábrica: mientras no suba las suyas, la historia muestra la
   * diapositiva de ejemplo que trae `INITIAL_STORIES`.
   *
   * Las de "Clientes" no están aquí: se arman solas con las entregas reales
   * que ya se cargan en Panel › Entregas.
   */
  shippingSlides: StorySlide[];
  promoSlides: StorySlide[];
  reviewSlides: StorySlide[];
  /** El flyer de bienvenida. Ver `PopupAnnouncement`. */
  popupAnnouncement: PopupAnnouncement;
}

/**
 * Lo que el panel decidió sobre el catálogo generado, y que una regeneración
 * (`npm run catalogo`) no puede borrar.
 *
 * Los pares que el dueño creó desde el panel no necesitan lista: se reconocen
 * porque su id no está en el catálogo del código. Lo que sí hay que anotar es
 * lo que no se puede deducir mirando el resultado: un par del código que falta
 * puede ser uno que el dueño quitó o uno que el generador todavía no traía.
 */
export interface CatalogDecisions {
  /** Ids del catálogo del código que se quitaron desde el panel. */
  hiddenIds: string[];
  /** Ids del catálogo del código que se editaron desde el panel. */
  editedIds: string[];
}

export interface FilterState {
  searchQuery: string;
  category: 'all' | SneakerCategory;
  gender: 'all' | SneakerGender;
  brand: string;
  size: string;
  status: 'all' | SneakerStatus;
  minPrice: number;
  maxPrice: number;
  sortBy: 'featured' | 'price-asc' | 'price-desc' | 'newest' | 'discount';
}

export const DEFAULT_FILTERS: FilterState = {
  searchQuery: '',
  category: 'all',
  gender: 'all',
  brand: '',
  size: '',
  status: 'all',
  minPrice: 0,
  maxPrice: 3_000_000,
  sortBy: 'featured',
};
