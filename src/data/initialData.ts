import type { Delivery, Sneaker, StoreSettings, StoryHighlight } from '../types';
import { CATALOGO_GENERADO } from './catalogoGenerado';

/* ═══════════════════════════════════════════════════════════════════════
   AJUSTES DE FÁBRICA

   SEGURIDAD DEL PIN: en el repositorio no va ningún PIN, ni en claro ni con
   hash. Este repositorio es público, y un PIN publicado es un PIN conocido.

   El hash entra por `VITE_ADMIN_PIN_HASH`, que se configura en Vercel
   (Settings › Environment Variables) y por eso nunca se commitea. Si la
   variable no está —desarrollo local, o un despliegue recién creado—, el panel
   pide crear el PIN en el primer ingreso y lo guarda en el localStorage de ese
   navegador.

   Se exige el formato de un SHA-256 (64 dígitos hexadecimales) para que una
   variable mal pegada no deje la puerta en un estado raro: si no calza, se
   trata como si no existiera.
   ═══════════════════════════════════════════════════════════════════════ */

const ENV_PIN_HASH = String(import.meta.env.VITE_ADMIN_PIN_HASH ?? '').trim();
const FACTORY_PIN_HASH = /^[a-f0-9]{64}$/i.test(ENV_PIN_HASH) ? ENV_PIN_HASH : '';

export const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'PAPI SHOES',
  tagline: 'EL TEMPLO DE LOS TENIS',
  slogan: 'CULTURA · ESTILO · AUTENTICIDAD',
  whatsappNumber: '573045961031',
  whatsappMessageTemplate:
    '¡Hola PAPI SHOES! 👋 Me interesa el par *{modelo}* en talla *{talla}* ({categoria}). Vi el precio de *{precio}*. ¿Está disponible para entrega inmediata o cómo es el encargo?',
  adminUsername: 'papi.cardona',
  adminPinHash: FACTORY_PIN_HASH,
  currency: 'COP',
  currencySymbol: '$',
  announcement:
    'ENVÍOS A TODO EL PAÍS · ASESORÍA PERSONALIZADA 1 A 1 · CATÁLOGO ACTUALIZADO SEMANALMENTE',
  showAnnouncement: true,
  instagramHandle: 'papishoes_oficial',
  tiktokHandle: 'papishoes_cultura',
  locationCity: 'Medellín · Bogotá · Envíos Nacionales',
  guaranteeText: 'Garantía de calidad y autenticidad verificada en cada entrega.',
  // Vacías a propósito: son las fotos del dueño, que entran desde
  // Panel › Ajustes › Historias. Hasta entonces cada historia enseña la
  // diapositiva de ejemplo que trae INITIAL_STORIES.
  shippingSlides: [],
  promoSlides: [],
  reviewSlides: [],
  /* El flyer de bienvenida. Se administra en Panel › Ajustes › Anuncio
     emergente; el id es lo que decide a quién se le vuelve a mostrar. */
  popupAnnouncement: {
    id: 'chiva-rumbera-2026-09-05',
    enabled: true,
    image: '/anuncios/chiva-rumbera-05-septiembre.jpg',
    alt: 'Chiva Rumbera Vuelta Oriente, 5 de septiembre. Cover general 40K, grupo de 3 o más mujeres 35K. Recogida en CAI Playón a las 11:00 p. m.',
  },
};

/* ── Los cinco pilares del manual de marca ──────────────────────────────── */

export const BRAND_PILLARS = [
  {
    id: 'cultura',
    title: 'Cultura',
    text: 'Cada silueta carga una historia: la cancha, la calle, el escenario. Vendemos el contexto, no solo el par.',
  },
  {
    id: 'autenticidad',
    title: 'Autenticidad',
    text: 'Legit check documentado en la línea Originales. Si no pasa la revisión, no entra al templo.',
  },
  {
    id: 'exclusividad',
    title: 'Exclusividad',
    text: 'Tallas contadas y referencias que no vas a encontrar en vitrina de centro comercial.',
  },
  {
    id: 'comunidad',
    title: 'Comunidad',
    text: 'Asesoría uno a uno por WhatsApp. Te decimos si un par no te sirve, aunque perdamos la venta.',
  },
  {
    id: 'global',
    title: 'Global Sneaker Culture',
    text: 'Seguimos los drops internacionales y te traemos bajo encargo lo que se lanza afuera.',
  },
] as const;

/* ── Marcas del manual ──────────────────────────────────────────────────── */

export const BRAND_WALL = [
  'NIKE',
  'ADIDAS',
  'JORDAN',
  'YEEZY',
  'NEW BALANCE',
  'CALVIN KLEIN',
  'GUESS',
  'TRAVIS SCOTT',
] as const;


/* ── Historias destacadas (las 10 del manual de marca) ──────────────────────
   Cada una hace algo distinto al tocarla, según su `behavior`:

   · navigate  → atajo a una página que ya existe. Enseñar una diapositiva
                 antes de llevar al catálogo solo ponía un paso de más.
   · whatsapp  → la historia es una conversación, no una foto.
   · slides    → visor. Las de clientes, envíos, promos y reseñas se llenan
                 con material del dueño (entregas y Panel › Ajustes ›
                 Historias); las diapositivas de aquí abajo son el ejemplo
                 que se ve mientras no haya subido las suyas.
   ────────────────────────────────────────────────────────────────────────── */

export const INITIAL_STORIES: StoryHighlight[] = [
  {
    id: 'el-templo',
    title: 'EL TEMPLO',
    behavior: { type: 'navigate', to: '/nosotros' },
    iconName: 'Temple',
    previewImage: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=600&q=80',
    slides: [
      {
        image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1000&q=85',
        title: 'BIENVENIDO AL TEMPLO',
        caption: 'No es una tienda: es el lugar donde la cultura sneaker se cuida. Cada par pasa por revisión antes de llegar a ti.',
        badge: 'MÁS QUE TENIS',
      },
    ],
  },
  {
    id: 'clientes',
    title: 'CLIENTES',
    behavior: { type: 'slides' },
    iconName: 'Users',
    previewImage: 'https://images.unsplash.com/photo-1512374382149-233c42b6a83b?auto=format&fit=crop&w=600&q=80',
    slides: [
      {
        image: 'https://images.unsplash.com/photo-1512374382149-233c42b6a83b?auto=format&fit=crop&w=1000&q=85',
        title: 'CLIENTES SATISFECHOS',
        caption: 'Más de 1.500 pares entregados en todo el país.',
        badge: 'CONFIANZA',
      },
      {
        image: 'https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?auto=format&fit=crop&w=1000&q=85',
        title: 'UNBOXING EN VIVO',
        caption: 'Packaging protector y presentación de tienda en cada envío.',
        badge: 'EXPERIENCIA',
      },
    ],
  },
  {
    id: 'originales',
    title: 'ORIGINALES',
    behavior: { type: 'navigate', to: '/originales' },
    iconName: 'ShieldCheck',
    previewImage: 'https://images.unsplash.com/photo-1579338559194-a162d19bf842?auto=format&fit=crop&w=600&q=80',
    slides: [
      {
        image: 'https://images.unsplash.com/photo-1579338559194-a162d19bf842?auto=format&fit=crop&w=1000&q=85',
        title: 'LÍNEA 100% ORIGINAL',
        caption: 'Pares verificados con legit check y comprobante de procedencia.',
        badge: 'LEGIT CHECK',
        ctaText: 'Ver los Originales',
      },
      {
        image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1000&q=85',
        title: 'CÓMO VERIFICAMOS',
        caption: 'Costuras, códigos UV, etiqueta interior y peso calibrado.',
        badge: 'PROCESO',
      },
    ],
  },
  {
    id: 'catalogo',
    title: 'CATÁLOGO',
    behavior: { type: 'navigate', to: '/catalogo' },
    iconName: 'Package',
    previewImage: 'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?auto=format&fit=crop&w=600&q=80',
    slides: [
      {
        image: 'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?auto=format&fit=crop&w=1000&q=85',
        title: 'TODO EL STOCK',
        caption: 'Jordan, Nike, Yeezy, New Balance, Travis Scott y más.',
        badge: 'VARIEDAD',
        ctaText: 'Abrir catálogo',
      },
    ],
  },
  {
    id: 'bajo-encargo',
    title: 'BAJO ENCARGO',
    label: 'ENCARGOS',
    behavior: { type: 'whatsapp', messageKey: 'bajo-encargo' },
    iconName: 'ShoppingBag',
    previewImage: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=600&q=80',
    slides: [
      {
        image: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=1000&q=85',
        title: '¿BUSCAS ALGO ESPECÍFICO?',
        caption: 'Traemos cualquier referencia y talla en 8 a 14 días hábiles con abono del 50%.',
        badge: 'PERSONALIZADO',
        ctaText: 'Cotizar ahora',
      },
    ],
  },
  {
    id: 'referencias',
    title: 'REFERENCIAS',
    behavior: { type: 'whatsapp', messageKey: 'referencias' },
    iconName: 'SearchCheck',
    previewImage: 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=600&q=80',
    slides: [
      {
        image: 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=1000&q=85',
        title: 'REFERENCIAS Y LANZAMIENTOS',
        caption: 'Te contamos qué se lanza, cuándo, y si vale la pena esperarlo.',
        badge: 'ASESORÍA',
      },
    ],
  },
  {
    id: 'envios',
    title: 'ENVÍOS',
    behavior: { type: 'slides' },
    iconName: 'Truck',
    previewImage: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
    slides: [
      {
        image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1000&q=85',
        title: 'COBERTURA NACIONAL',
        caption: 'Despachos de lunes a sábado. Entregas de 24 a 48h en ciudades principales.',
        badge: 'RAPIDEZ',
      },
    ],
  },
  {
    id: 'promos',
    title: 'PROMOS',
    behavior: { type: 'slides' },
    iconName: 'Percent',
    previewImage: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80',
    slides: [
      {
        image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1000&q=85',
        title: 'COMBOS Y DESCUENTOS',
        caption: 'Lleva 2 pares y el envío corre por nuestra cuenta, más kit de limpieza.',
        badge: 'OFERTA',
      },
    ],
  },
  {
    id: 'faq',
    title: 'FAQ',
    // La página de preguntas vive en /preguntas, no en /faq: apuntar a /faq
    // caía en la pantalla de "no encontrado".
    behavior: { type: 'navigate', to: '/preguntas' },
    iconName: 'HelpCircle',
    previewImage: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=600&q=80',
    slides: [
      {
        image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=1000&q=85',
        title: 'PREGUNTAS FRECUENTES',
        caption: 'Tallas, pagos, cambios y tiempos de entrega resueltos en un solo lugar.',
        badge: 'SOPORTE',
        ctaText: 'Leer respuestas',
      },
    ],
  },
  {
    id: 'resenas',
    title: 'RESEÑAS',
    behavior: { type: 'slides' },
    iconName: 'Star',
    previewImage: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=600&q=80',
    slides: [
      {
        image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=1000&q=85',
        title: 'LO QUE DICEN',
        caption: 'Calificación 5.0 sostenida. Atención rápida y calidad consistente.',
        badge: 'REVIEWS',
      },
    ],
  },
];

/**
 * Mensajes con los que se abre WhatsApp desde la fila de historias, por
 * `messageKey`. Aquí y no en el componente para que el texto que le llega al
 * cliente se lea junto al resto de los textos de la marca.
 */
export const STORY_WHATSAPP_MESSAGES: Record<string, string> = {
  'bajo-encargo': 'Hola, quiero cotizar un par bajo encargo 👟',
  referencias: 'Hola, quiero información sobre referencias y lanzamientos 👟',
};


/* ── Entregas documentadas ───────────────────────────────────────────────
   Ejemplos para que el muro no aparezca vacío la primera vez. Bórralos
   desde Panel › Entregas cuando subas las fotos reales.
   Regla de privacidad: barrio y ciudad, nunca dirección exacta.
   ──────────────────────────────────────────────────────────────────────── */

export const INITIAL_DELIVERIES: Delivery[] = [
  {
    id: 'entrega-demo-1',
    image:
      'https://images.unsplash.com/photo-1512374382149-233c42b6a83b?auto=format&fit=crop&w=900&q=85',
    city: 'Medellín',
    neighborhood: 'Laureles',
    productName: 'Air Jordan 1 High OG "UNC Toe"',
    note: 'Entrega en mano, talla 42.',
    deliveredAt: '2026-07-28T00:00:00.000Z',
    locationInImage: false,
    createdAt: '2026-07-28T00:00:00.000Z',
  },
  {
    id: 'entrega-demo-2',
    image:
      'https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?auto=format&fit=crop&w=900&q=85',
    city: 'Bogotá',
    neighborhood: 'Chapinero',
    productName: 'Yeezy Boost 350 V2 "Black Reflective"',
    note: 'Envío recibido en 24 horas.',
    deliveredAt: '2026-07-19T00:00:00.000Z',
    locationInImage: false,
    createdAt: '2026-07-19T00:00:00.000Z',
  },
  {
    id: 'entrega-demo-3',
    image:
      'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=900&q=85',
    city: 'Cali',
    neighborhood: 'Granada',
    productName: 'New Balance 550',
    deliveredAt: '2026-06-30T00:00:00.000Z',
    locationInImage: false,
    createdAt: '2026-06-30T00:00:00.000Z',
  },
  {
    id: 'entrega-demo-4',
    image:
      'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=900&q=85',
    city: 'Barranquilla',
    neighborhood: 'Alto Prado',
    productName: 'Air Jordan 1 Low',
    note: 'Bajo encargo, llegó en 9 días.',
    deliveredAt: '2026-06-12T00:00:00.000Z',
    locationInImage: false,
    createdAt: '2026-06-12T00:00:00.000Z',
  },
];

/* Catálogo de ejemplo. Solo se usa si todavía no has generado el tuyo. */
const DEMO_SNEAKERS: Sneaker[] = [
  {
    id: 'jordan-1-unc-toe',
    name: 'Air Jordan 1 High OG "UNC Toe"',
    brand: 'Jordan',
    model: 'Air Jordan 1 Retro High OG',
    sku: 'DZ5485-400',
    category: 'originales',
    gender: 'unisex',
    price: 850000,
    originalPrice: 950000,
    images: [
      'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1579338559194-a162d19bf842?auto=format&fit=crop&w=1200&q=85'
    ],
    sizes: [36, 37, 38, 39, 40, 41, 42, 43, 44],
    status: 'disponible',
    isFeatured: true,
    isNewArrival: true,
    isOriginalCertified: true,
    description: 'Silueta legendaria en combinación University Blue, Black y White. Cuero vacuno de máxima textura, costuras reforzadas y tecnología Nike Air encapsulada en la suela.',
    details: {
      condition: 'Nuevo en caja original (Deadstock)',
      colorway: 'University Blue / Black / White',
      includedItems: ['Caja original OG', 'Cordones extras azul claro y negro', 'Certificado de autenticidad Papi Shoes', 'Horma protectora'],
      releaseYear: 2023,
      qualityBadge: '100% Original Legit Check',
      authenticityNotes: 'Comprobante de procedencia verificado con factura y código QR interno.'
    },
    viewsCount: 1420,
    inquiriesCount: 88,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-07T12:00:00Z'
  },
  {
    id: 'yeezy-350-v2-black-reflective',
    name: 'Yeezy Boost 350 V2 "Black Reflective"',
    brand: 'Yeezy',
    model: 'Yeezy Boost 350 V2',
    sku: 'FU9007',
    category: 'originales',
    gender: 'unisex',
    price: 920000,
    originalPrice: 1100000,
    images: [
      'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1512374382149-233c42b6a83b?auto=format&fit=crop&w=1200&q=85'
    ],
    sizes: [36, 37, 38, 39, 40, 41, 42, 43, 44],
    status: 'disponible',
    isFeatured: true,
    isNewArrival: false,
    isOriginalCertified: true,
    description: 'Tejido Primeknit de alta resistencia con filamentos reflectivos 3M que brillan con el flash. Amortiguación Boost completa en la mediasuela para máximo confort urbano.',
    details: {
      condition: 'Nuevo en caja original',
      colorway: 'Core Black / Static Reflective',
      includedItems: ['Caja Yeezy con etiquetas originales', 'Plantillas Ortholite Boost', 'Sello de garantía Papi Shoes'],
      releaseYear: 2022,
      qualityBadge: '100% Original Legit Check'
    },
    viewsCount: 2310,
    inquiriesCount: 145,
    createdAt: '2026-08-02T11:30:00Z',
    updatedAt: '2026-08-07T14:20:00Z'
  },
  {
    id: 'travis-scott-jordan-1-low-reverse-mocha',
    name: 'Travis Scott x Air Jordan 1 Low "Reverse Mocha"',
    brand: 'Travis Scott',
    model: 'Air Jordan 1 Low OG SP',
    sku: 'DM7866-162',
    category: 'originales',
    gender: 'hombre',
    price: 1350000,
    originalPrice: 1500000,
    images: [
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1200&q=85'
    ],
    sizes: [39, 40, 41, 42, 43, 44],
    status: 'bajo_encargo',
    isFeatured: true,
    isNewArrival: true,
    isOriginalCertified: true,
    description: 'La colaboración más codiciada del sneaker game. Swoosh invertido en tono Sail, gamuza suave marrón moca y detalles bordados de Cactus Jack en el talón.',
    details: {
      condition: 'Bajo encargo / Importación garantizada',
      colorway: 'Sail / Ridgerock / University Red',
      includedItems: ['Caja especial Cactus Jack con papel protector', '3 pares de cordones adicionales (Rojos, Marrones y Sail)', 'Autenticación previa al despacho'],
      releaseYear: 2022,
      qualityBadge: 'Pieza de Colección Original'
    },
    viewsCount: 3890,
    inquiriesCount: 210,
    createdAt: '2026-08-03T09:00:00Z',
    updatedAt: '2026-08-07T16:00:00Z'
  },
  {
    id: 'nike-dunk-low-panda',
    name: 'Nike Dunk Low Retro "Panda"',
    brand: 'Nike',
    model: 'Nike Dunk Low',
    sku: 'DD1391-100',
    category: 'general',
    gender: 'unisex',
    price: 360000,
    originalPrice: 420000,
    images: [
      'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1200&q=85'
    ],
    sizes: [35, 36, 37, 38, 39, 40, 41, 42, 43, 44],
    status: 'disponible',
    isFeatured: true,
    isNewArrival: false,
    isOriginalCertified: false,
    description: 'El par más versátil del streetwear mundial. Bloques de color blanco y negro impecables, cuello acolchado de perfil bajo y suela de tracción duradera.',
    details: {
      condition: 'Nuevo con caja y etiquetas',
      colorway: 'White / Black',
      includedItems: ['Caja Nike Sportswear', 'Cordones negros', 'Stickers Papi Shoes'],
      qualityBadge: 'Catálogo General Streetwear Edition'
    },
    viewsCount: 1850,
    inquiriesCount: 130,
    createdAt: '2026-08-04T12:00:00Z',
    updatedAt: '2026-08-07T11:00:00Z'
  },
  {
    id: 'jordan-4-military-black',
    name: 'Air Jordan 4 Retro "Military Black"',
    brand: 'Jordan',
    model: 'Air Jordan 4 Retro',
    sku: 'DH6927-111',
    category: 'general',
    gender: 'hombre',
    price: 480000,
    originalPrice: 560000,
    images: [
      'https://images.unsplash.com/photo-1579338559194-a162d19bf842?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1200&q=85'
    ],
    sizes: [39, 40, 41, 42, 43, 44],
    status: 'disponible',
    isFeatured: true,
    isNewArrival: true,
    isOriginalCertified: false,
    description: 'Estructura robusta con paneles de malla transpirable, refuerzos en las alas y cámara de aire visible en el talón. Uno de los favoritos de los coleccionistas.',
    details: {
      condition: 'Nuevo en caja',
      colorway: 'White / Black / Neutral Grey',
      includedItems: ['Caja Jordan Retro', 'Hangtag Jumpman', 'Hormas protectoras'],
      qualityBadge: 'Catálogo General Streetwear Edition'
    },
    viewsCount: 1640,
    inquiriesCount: 94,
    createdAt: '2026-08-04T15:00:00Z',
    updatedAt: '2026-08-07T15:30:00Z'
  },
  {
    id: 'new-balance-550-white-green',
    name: 'New Balance 550 "White Green"',
    brand: 'New Balance',
    model: 'New Balance 550 Basketball',
    sku: 'BB550WT1',
    category: 'general',
    gender: 'mujer',
    price: 380000,
    originalPrice: 440000,
    images: [
      'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=1200&q=85'
    ],
    sizes: [35, 36, 37, 38, 39, 40],
    status: 'disponible',
    isFeatured: false,
    isNewArrival: false,
    isOriginalCertified: false,
    description: 'Estética retro basket de los años 80. Cuero microperforado, acentos verdes bosque y suela bicolor con logo clásico 550 grabado en el antepié.',
    details: {
      condition: 'Nuevo en caja original',
      colorway: 'White / Team Green',
      includedItems: ['Caja New Balance', 'Etiquetas oficiales'],
      qualityBadge: 'Catálogo General Streetwear Edition'
    },
    viewsCount: 980,
    inquiriesCount: 45,
    createdAt: '2026-08-05T10:00:00Z',
    updatedAt: '2026-08-07T10:00:00Z'
  },
  {
    id: 'air-force-1-07-white',
    name: 'Nike Air Force 1 \'07 "Triple White"',
    brand: 'Nike',
    model: 'Air Force 1 Low',
    sku: 'CW2288-111',
    category: 'general',
    gender: 'unisex',
    price: 290000,
    originalPrice: 340000,
    images: [
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?auto=format&fit=crop&w=1200&q=85'
    ],
    sizes: [35, 36, 37, 38, 39, 40, 41, 42, 43, 44],
    status: 'disponible',
    isFeatured: false,
    isNewArrival: false,
    isOriginalCertified: false,
    description: 'El clásico indiscutible. Acabado blanco monocromático impecable con deubré metálico AF1 grabado y suela de pivote de caucho macizo.',
    details: {
      condition: 'Nuevo con caja',
      colorway: 'Triple White',
      includedItems: ['Caja Nike Air Force 1', 'Deubré metálico AF1'],
      qualityBadge: 'Catálogo General Streetwear Edition'
    },
    viewsCount: 2100,
    inquiriesCount: 160,
    createdAt: '2026-08-05T14:00:00Z',
    updatedAt: '2026-08-07T08:00:00Z'
  },
  {
    id: 'yeezy-foam-runner-onyx',
    name: 'Yeezy Foam Runner "Onyx"',
    brand: 'Yeezy',
    model: 'Foam RNR',
    sku: 'HP8739',
    category: 'originales',
    gender: 'unisex',
    price: 680000,
    originalPrice: 780000,
    images: [
      'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=1200&q=85'
    ],
    sizes: [36, 37, 38, 39, 40, 41, 42, 43, 44],
    status: 'disponible',
    isFeatured: true,
    isNewArrival: true,
    isOriginalCertified: true,
    description: 'Diseño esculpido futurista fabricado a partir de espuma EVA cosechada y algas. Máxima ligereza y ventilación para un estilo vanguardista inigualable.',
    details: {
      condition: 'Nuevo en caja original Foam RNR',
      colorway: 'Onyx Dark Charcoal',
      includedItems: ['Caja original de cartón ecológico Yeezy', 'Certificado de autenticidad'],
      releaseYear: 2022,
      qualityBadge: '100% Original Legit Check'
    },
    viewsCount: 1750,
    inquiriesCount: 82,
    createdAt: '2026-08-06T09:00:00Z',
    updatedAt: '2026-08-07T13:00:00Z'
  },
  {
    id: 'jordan-1-low-travis-scott-canary',
    name: 'Travis Scott x Air Jordan 1 Low "Canary"',
    brand: 'Travis Scott',
    model: 'Air Jordan 1 Low OG',
    sku: 'DZ4137-700',
    category: 'originales',
    gender: 'mujer',
    price: 1420000,
    originalPrice: 1600000,
    images: [
      'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1200&q=85'
    ],
    sizes: [35, 36, 37, 38, 39, 40, 41],
    status: 'bajo_encargo',
    isFeatured: true,
    isNewArrival: true,
    isOriginalCertified: true,
    description: 'Inspirada en los colores de la escuela secundaria de Travis (Elkins High School). Combinación Canary Yellow, Racer Blue y Light Silver con logo Cactus Jack.',
    details: {
      condition: 'Bajo encargo especial (Entrega en 10 días)',
      colorway: 'Canary / Racer Blue / Light Silver',
      includedItems: ['Caja especial amarilla', '3 juegos de cordones', 'Certificado de inspección previa'],
      releaseYear: 2024,
      qualityBadge: 'Pieza de Colección Original'
    },
    viewsCount: 2890,
    inquiriesCount: 154,
    createdAt: '2026-08-06T14:00:00Z',
    updatedAt: '2026-08-07T16:45:00Z'
  },
  {
    id: 'adidas-campus-00s-core-black',
    name: 'Adidas Originals Campus 00s "Core Black"',
    brand: 'Adidas',
    model: 'Campus 00s Skate',
    sku: 'HQ8708',
    category: 'general',
    gender: 'unisex',
    price: 330000,
    originalPrice: 390000,
    images: [
      'https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?auto=format&fit=crop&w=1200&q=85'
    ],
    sizes: [35, 36, 37, 38, 39, 40, 41, 42, 43, 44],
    status: 'disponible',
    isFeatured: false,
    isNewArrival: true,
    isOriginalCertified: false,
    description: 'Silueta chunky inspirada en la era skate de los 2000. Gamuza premium negra, 3 rayas sobredimensionadas en blanco y cordones anchos fat laces.',
    details: {
      condition: 'Nuevo en caja con fat laces',
      colorway: 'Core Black / Footwear White / Off White',
      includedItems: ['Caja azul Adidas Originals', 'Cordones anchos negros y blancos', 'Etiquetas'],
      qualityBadge: 'Catálogo General Streetwear Edition'
    },
    viewsCount: 1210,
    inquiriesCount: 76,
    createdAt: '2026-08-06T16:00:00Z',
    updatedAt: '2026-08-07T14:10:00Z'
  }
];

/**
 * El catálogo real lo escribe `npm run catalogo` en `catalogoGenerado.ts` a
 * partir de las fotos de `public/catalogo/`. Si ese archivo está vacío, el
 * sitio cae en el catálogo de ejemplo para no quedar en blanco.
 */
export const INITIAL_SNEAKERS: Sneaker[] = CATALOGO_GENERADO.length
  ? CATALOGO_GENERADO
  : DEMO_SNEAKERS;
