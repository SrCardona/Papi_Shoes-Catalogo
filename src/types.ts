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

export interface StoryHighlight {
  id: string;
  title: string;
  iconName: string;
  previewImage: string;
  slides: StorySlide[];
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
