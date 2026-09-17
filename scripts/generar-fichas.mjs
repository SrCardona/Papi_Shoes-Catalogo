/**
 * FICHAS PARA COMPARTIR Y MAPA DEL SITIO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Corre solo, después de `vite build`, y escribe dentro de `dist/`:
 *
 *   dist/producto/<id>/index.html   una por par, con su título y su foto
 *   dist/sitemap.xml                todas las direcciones del sitio
 *
 * POR QUÉ EXISTE
 * ──────────────
 * El sitio es una sola página que arma React en el navegador. El robot de
 * WhatsApp no ejecuta JavaScript: pide la dirección, lee el HTML tal como sale
 * del servidor y con eso dibuja la tarjeta del enlace. Hasta ahora ese HTML era
 * el mismo para las 615 fichas, así que todo par compartido salía con el
 * título de la portada y sin foto. Y todo el negocio pasa por WhatsApp.
 *
 * `ProductPage` cambia el `document.title` con un efecto, y eso sigue sirviendo
 * para la pestaña del navegador; lo que no puede es llegarle al robot.
 *
 * La solución es la más simple que funciona: una copia del HTML compilado por
 * cada par, con sus etiquetas ya escritas. Vercel sirve el archivo estático
 * antes de mirar la reescritura hacia `index.html`, así que el robot recibe la
 * ficha buena y el visitante recibe exactamente la misma aplicación de siempre
 * —React arranca igual y toma el control—. Sin servidor nuevo, sin middleware,
 * sin nada que se pueda caer en caliente.
 *
 * NO SE VERSIONA NADA DE LO QUE ESCRIBE: todo vive en `dist/`, que se rehace
 * en cada compilación.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(RAIZ, 'dist');
const PLANTILLA = join(DIST, 'index.html');
const CATALOGO = join(RAIZ, 'src', 'data', 'catalogoGenerado.ts');

/* El dominio bueno, con `www`: el otro responde 308 y una etiqueta que apunta
   a una redirección hace trabajar de más al robot que la lee. */
const SITIO = 'https://www.papishoes.shop';

/* Las rutas fijas de la aplicación. `/admin` queda fuera a propósito: no es
   para visitantes y no tiene por qué estar en un mapa público. */
const PAGINAS = [
  { ruta: '/', prioridad: '1.0' },
  { ruta: '/originales', prioridad: '0.9' },
  { ruta: '/sneakers', prioridad: '0.9' },
  { ruta: '/catalogo', prioridad: '0.8' },
  { ruta: '/nosotros', prioridad: '0.5' },
  { ruta: '/preguntas', prioridad: '0.5' },
];

/** Texto que entra en el cuerpo de un HTML. */
function escapaTexto(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Texto que entra en un atributo, entre comillas dobles. */
function escapaAtributo(valor) {
  return escapaTexto(valor).replace(/"/g, '&quot;');
}

/**
 * Dirección absoluta de una foto.
 *
 * Las del catálogo son rutas propias y hay que codificar cada tramo —algunos
 * nombres traen paréntesis o espacios— sin tocar las barras. Las que el dueño
 * subió desde el panel ya vienen absolutas y se dejan como están.
 */
function fotoAbsoluta(ruta) {
  if (!ruta) return `${SITIO}/og.jpg`;
  if (ruta.startsWith('http')) return ruta;
  const codificada = ruta.split('/').map(encodeURIComponent).join('/');
  return `${SITIO}${codificada}`;
}

function precioEnPesos(valor) {
  return `$${Number(valor).toLocaleString('es-CO')}`;
}

/**
 * El renglón que se lee bajo el título en la tarjeta del enlace.
 *
 * Lleva precio y tallas porque son las dos preguntas con las que arranca cada
 * conversación de WhatsApp: adelantarlas ahorra un ida y vuelta.
 */
function descripcionDe(par) {
  const linea =
    par.category === 'originales'
      ? 'Original con legit check'
      : 'Sneakers de uso diario';
  const color = par.details?.colorway ? ` ${par.details.colorway}.` : '';
  const tallas = par.sizes?.length
    ? ` Tallas ${par.sizes[0]} a ${par.sizes[par.sizes.length - 1]}.`
    : '';
  return `${linea}.${color} ${precioEnPesos(par.price)}.${tallas} Cotiza por WhatsApp.`;
}

/**
 * Ficha de producto para Google: lo que convierte un resultado de búsqueda en
 * uno con precio y disponibilidad a la vista.
 */
function datosEstructurados(par, url, foto) {
  const disponible =
    par.status === 'agotado'
      ? 'https://schema.org/OutOfStock'
      : par.status === 'bajo_encargo'
        ? 'https://schema.org/PreOrder'
        : 'https://schema.org/InStock';

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: par.name,
    brand: { '@type': 'Brand', name: par.brand },
    description: par.description || descripcionDe(par),
    image: [foto],
    sku: par.sku,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'COP',
      price: String(par.price),
      availability: disponible,
      seller: { '@type': 'Organization', name: 'PAPI SHOES' },
    },
    /* El `<` de un texto cualquiera dentro de un `<script>` puede cerrar la
       etiqueta antes de tiempo. Se neutraliza en el propio JSON. */
  }).replace(/</g, '\\u003c');
}

/**
 * Cambia una etiqueta `<meta>` ya existente por su valor nuevo.
 *
 * Los reemplazos de este archivo se hacen con una función y no con una cadena
 * a propósito: dentro de una cadena de reemplazo el signo de pesos es un
 * comando —`$1` significa "el primer grupo capturado"—, y los precios de este
 * catálogo empiezan justamente por `$`. Con la cadena, la descripción de un par
 * de $180.000 salía publicada como "80.000".
 */
function reemplazaMeta(html, atributo, nombre, contenido) {
  const patron = new RegExp(
    `(<meta\\s+${atributo}="${nombre}"\\s+content=")[^"]*(")`,
    'i',
  );
  if (!patron.test(html)) {
    throw new Error(
      `No encontré <meta ${atributo}="${nombre}"> en dist/index.html. ` +
        'Si se editó index.html, hay que ajustar este script.',
    );
  }
  const valor = escapaAtributo(contenido);
  return html.replace(patron, (_todo, antes, despues) => antes + valor + despues);
}

/** Lee el arreglo de pares del archivo generado, sin compilar TypeScript. */
function leeCatalogo() {
  const fuente = readFileSync(CATALOGO, 'utf8');
  /* Se ancla en el nombre y luego en el `=` de la asignación: buscar el primer
     `[` a secas se tropieza con el de `Sneaker[]`, que está antes. */
  const anclaje = fuente.indexOf('CATALOGO_GENERADO');
  const igual = anclaje === -1 ? -1 : fuente.indexOf('=', anclaje);
  const desde = igual === -1 ? -1 : fuente.indexOf('[', igual);
  const hasta = fuente.lastIndexOf(']');
  if (desde === -1 || hasta === -1 || hasta < desde) {
    throw new Error('No pude encontrar el arreglo dentro de catalogoGenerado.ts.');
  }
  const pares = JSON.parse(fuente.slice(desde, hasta + 1));
  if (!Array.isArray(pares) || !pares.length) {
    throw new Error('El catálogo generado quedó vacío.');
  }
  return pares;
}

function fichaDe(plantilla, par) {
  const url = `${SITIO}/producto/${par.id}`;
  const foto = fotoAbsoluta(par.images?.[0]);
  /* El color entra al título cuando no está ya en el nombre: hay pares que se
     llaman igual y solo se distinguen por ahí —el Suede XL negro y el rojo—, y
     compartidos se verían como el mismo enlace dos veces. */
  const color = par.details?.colorway ?? '';
  const distingue =
    color && !par.name.toLowerCase().includes(color.toLowerCase())
      ? ` · ${color}`
      : '';
  const titulo = `${par.name}${distingue} — PAPI SHOES`;
  const descripcion = descripcionDe(par);

  let html = plantilla;
  const tituloEscapado = escapaTexto(titulo);
  html = html.replace(
    /<title>[^<]*<\/title>/i,
    () => `<title>${tituloEscapado}</title>`,
  );
  const urlEscapada = escapaAtributo(url);
  html = html.replace(
    /(<link rel="canonical" href=")[^"]*(")/i,
    (_todo, antes, despues) => antes + urlEscapada + despues,
  );
  html = reemplazaMeta(html, 'name', 'description', descripcion);
  html = reemplazaMeta(html, 'property', 'og:type', 'product');
  html = reemplazaMeta(html, 'property', 'og:url', url);
  html = reemplazaMeta(html, 'property', 'og:title', titulo);
  html = reemplazaMeta(html, 'property', 'og:description', descripcion);
  html = reemplazaMeta(html, 'property', 'og:image', foto);
  html = reemplazaMeta(html, 'property', 'og:image:alt', par.name);
  html = reemplazaMeta(html, 'name', 'twitter:image', foto);

  /* Las medidas de la portada no son las de la foto del par: dejarlas puestas
     hace que WhatsApp reserve un recuadro que no corresponde. */
  html = html.replace(
    /\s*<meta property="og:image:width" content="[^"]*" \/>/i,
    '',
  );
  html = html.replace(
    /\s*<meta property="og:image:height" content="[^"]*" \/>/i,
    '',
  );

  const ficha = datosEstructurados(par, url, foto);
  return html.replace(
    '</head>',
    `  <script type="application/ld+json">${ficha}</script>\n  </head>`,
  );
}

function mapaDelSitio(pares) {
  const hoy = new Date().toISOString().slice(0, 10);
  const entradas = [
    ...PAGINAS.map(
      ({ ruta, prioridad }) =>
        `  <url><loc>${SITIO}${ruta}</loc><lastmod>${hoy}</lastmod><priority>${prioridad}</priority></url>`,
    ),
    ...pares.map((par) => {
      const fecha = (par.updatedAt || par.createdAt || '').slice(0, 10) || hoy;
      return `  <url><loc>${SITIO}/producto/${par.id}</loc><lastmod>${fecha}</lastmod><priority>0.7</priority></url>`;
    }),
  ];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entradas,
    '</urlset>',
    '',
  ].join('\n');
}

function main() {
  if (!existsSync(PLANTILLA)) {
    throw new Error(
      'No existe dist/index.html. Este script corre después de `vite build`.',
    );
  }

  const plantilla = readFileSync(PLANTILLA, 'utf8');
  const pares = leeCatalogo();

  for (const par of pares) {
    const carpeta = join(DIST, 'producto', par.id);
    mkdirSync(carpeta, { recursive: true });
    writeFileSync(join(carpeta, 'index.html'), fichaDe(plantilla, par), 'utf8');
  }

  writeFileSync(join(DIST, 'sitemap.xml'), mapaDelSitio(pares), 'utf8');

  const sinFoto = pares.filter((p) => !p.images?.length).length;
  console.log(`OK ${pares.length} fichas en dist/producto/`);
  console.log(`OK sitemap.xml con ${pares.length + PAGINAS.length} direcciones`);
  if (sinFoto) {
    console.log(
      `   ${sinFoto} par(es) sin foto: su enlace compartirá la imagen de la portada.`,
    );
  }
}

main();
