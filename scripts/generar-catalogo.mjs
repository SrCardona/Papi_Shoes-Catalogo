/**
 * GENERADOR DE CATÁLOGO A PARTIR DE LAS FOTOS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lee las fotos de `public/catalogo/`, deduce nombre, marca, línea y horma
 * desde el nombre del archivo y las carpetas, y escribe un respaldo JSON que
 * se importa desde Panel › Ajustes › Restaurar respaldo.
 *
 *   node scripts/generar-catalogo.mjs --marca=Adidas --precio=180000 --antes=210000
 *
 * BANDERAS
 * ────────
 *   --marca=Adidas     Fuerza la marca de todo el lote (útil al cargar marca
 *                      por marca: los archivos "CALIFORNIA.jpg" no la dicen).
 *   --precio=180000    Precio para los pares que no estén en precios.csv.
 *   --antes=210000     Precio anterior, el que se muestra tachado.
 *   --linea=originales Fuerza la línea de todo el lote.
 *
 * CÓMO ORGANIZAR LAS FOTOS
 * ────────────────────────
 *   public/catalogo/
 *     sneakers/adidas/adidas-samba-og.jpg
 *     sneakers/adidas/adidas-samba-og_2.jpg          ← 2ª foto del mismo par
 *     sneakers/nike/mujer/nike-dunk-low-panda.jpg
 *     originales/jordan/air-jordan-1-high-og-unc-toe.jpg
 *
 *   · Carpeta `originales` → línea Originales. Cualquier otra → línea Sneakers.
 *   · Carpeta con nombre de marca (`adidas`, `nike`, `jordan`, `yeezy`,
 *     `new-balance`, `puma`, `asics`, `travis-scott`, `off-white`) → esa marca
 *     para todo lo que haya dentro. Es lo que hace que cada marca sea una
 *     sección propia y que al agregar la siguiente no se toque la anterior.
 *   · Carpeta `mujer` o `hombre` → esa horma. Sin carpeta → unisex.
 *   · Varias fotos del mismo par: mismo nombre y sufijo `_2`, `_3`…
 *     La primera queda como portada. SOLO el guion bajo agrupa: un `(1)` o un
 *     `-2` se dejan como pares distintos, porque en la práctica los catálogos
 *     los usan para colorways diferentes (Stan Smith negro / azul / verde).
 *
 * AJUSTES MANUALES
 * ────────────────
 * Un archivo por marca en `ajustes/` (por ejemplo `ajustes/adidas.json`), con
 * correcciones por nombre de archivo sin extensión. Se aplican encima de lo que
 * dedujo el script. Se leen todos y se combinan, así que cada marca se corrige
 * en su archivo sin tocar las demás.
 *
 *   {
 *     "adidas-sl-72-brown": { "name": "Adidas SL 72 Brown",
 *                             "colorway": "Brown / Gum" }
 *   }
 *
 * PRECIOS
 * ───────
 * Opcional: crea `precios.csv` en la raíz del proyecto. Tercera columna
 * opcional para el precio tachado.
 *
 *   archivo,precio,antes
 *   marca:Louis Vuitton,190000,230000
 *   marca:Nike,180000,210000
 *   air-jordan-1-high-og-unc-toe,850000,990000
 *
 * Una fila `marca:<Marca>` fija el precio de toda esa marca, que es como se
 * cargan los lotes: cada marca entra con su precio y las anteriores no se
 * tocan. Una fila por nombre de archivo le gana a la de su marca, y las
 * banderas `--precio`/`--antes` son el respaldo de lo que no aparezca aquí.
 *
 * Los pares sin precio quedan en 0 y el script los lista al final.
 */

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, extname, basename, sep } from 'node:path';

const ROOT = process.cwd();

const flags = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [key, value = 'true'] = a.replace(/^--/, '').split('=');
      return [key, value];
    }),
);

const MARCA_FORZADA = flags.marca ?? null;
const LINEA_FORZADA = flags.linea === 'originales' ? 'originales' : null;
const PRECIO_BASE = Number(flags.precio) || 0;
const PRECIO_ANTES = Number(flags.antes) || 0;
const PHOTO_DIR = join(ROOT, 'public', 'catalogo');
const PRICES_FILE = join(ROOT, 'precios.csv');
const ARRIVALS_FILE = join(ROOT, 'llegadas.json');
const OUTPUT_FILE = join(ROOT, 'catalogo-papishoes.json');
const OVERRIDES_DIR = join(ROOT, 'ajustes');
const TS_OUTPUT_FILE = join(ROOT, 'src', 'data', 'catalogoGenerado.ts');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

/* ── Diccionarios ────────────────────────────────────────────────────────── */

/* El orden importa: "air jordan" debe ganarle a "nike". */
const BRAND_RULES = [
  [/louis\s?vuitton|\blv\b/i, 'Louis Vuitton'],
  [/travis|cactus\s?jack/i, 'Travis Scott'],
  [/off[\s-]?white|\bow\b/i, 'Off-White'],
  [/yeezy|\b350\b|\b700\b|\bfoam\b/i, 'Yeezy'],
  [/jordan|\bjd\b|\baj\d/i, 'Jordan'],
  [/new\s?balance|\bnb\b|\b550\b|\b990\b|\b2002r?\b|\b9060\b/i, 'New Balance'],
  [/adidas|samba|gazelle|campus|forum|superstar|spezial/i, 'Adidas'],
  [/nike|dunk|air\s?force|air\s?max|\baf1\b|blazer|cortez|vomero|\bsb\b/i, 'Nike'],
  [/asics|gel[\s-]?\w+/i, 'Asics'],
  [/puma|suede|palermo|speedcat/i, 'Puma'],
];

/* Siglas que no se escriben en minúscula ni en capitalización normal. */
const UPPERCASE_TOKENS = new Set([
  'og', 'sb', 'ts', 'unc', 'af1', 'v2', '3m', 'nb', 'gs', 'sp', 'prm',
  'qs', 'db', 'xl', 'ii', 'iii', 'iv', 'lv', 'cdg', 'uv', 'dn', 'tn',
]);

/* Carpeta → marca. Es la vía principal: cargamos marca por marca. */
const BRAND_FOLDERS = new Map([
  ['adidas', 'Adidas'],
  ['nike', 'Nike'],
  ['jordan', 'Jordan'],
  ['yeezy', 'Yeezy'],
  ['new-balance', 'New Balance'],
  ['newbalance', 'New Balance'],
  ['nb', 'New Balance'],
  ['travis-scott', 'Travis Scott'],
  ['travis', 'Travis Scott'],
  ['off-white', 'Off-White'],
  ['louis-vuitton', 'Louis Vuitton'],
  ['lv', 'Louis Vuitton'],
  ['puma', 'Puma'],
  ['asics', 'Asics'],
  ['otras', 'Otras'],
]);

/* Tokens que indican horma dentro del propio nombre del archivo. */
const WOMEN_TOKENS = /\b(wmns|women|womens|mujer|dama|femenino|w)\b/i;
const MEN_TOKENS = /\b(mens|men|hombre|masculino)\b/i;

const SIZES_BY_GENDER = {
  mujer: [35, 36, 37, 38, 39, 40],
  hombre: [39, 40, 41, 42, 43, 44, 45],
  unisex: [37, 38, 39, 40, 41, 42, 43, 44],
};

/* ── Utilidades ──────────────────────────────────────────────────────────── */

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (IMAGE_EXT.has(extname(entry).toLowerCase())) acc.push(full);
  }
  return acc;
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Nombre de archivo → nombre presentable.
 * "air-jordan-1-high-og-unc-toe" → "Air Jordan 1 High OG UNC Toe"
 */
function prettifyName(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => {
      if (UPPERCASE_TOKENS.has(word)) return word.toUpperCase();
      if (/^\d+$/.test(word)) return word;
      // Alfanuméricos tipo "2002r" o "dz5485": mayúscula inicial y ya.
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function detectBrand(text) {
  for (const [pattern, brand] of BRAND_RULES) {
    if (pattern.test(text)) return brand;
  }
  return 'Otras';
}

/**
 * Detecta el sufijo de foto en el nombre del archivo.
 *
 * Solo `_2` y ` (2)` cuentan como número de foto. Un `-2` o un ` 2` final se
 * dejan quietos a propósito: "Air Jordan 1" y "Air Jordan 4" acabarían
 * fusionados en un solo par, y mezclar dos modelos distintos es mucho peor
 * que separar dos fotos del mismo. Si tienes series así, renómbralas con
 * guion bajo — el script te avisa cuáles.
 */
function stripPhotoIndex(rawName) {
  const underscore = rawName.match(/^(.*?)_\s*\d{1,2}\s*$/);
  if (underscore) return { base: underscore[1], hadIndex: true };
  return { base: rawName, hadIndex: false };
}

/** Nombre sin las marcas de horma: "Wmns New Balance 550" → "New Balance 550". */
function stripGenderTokens(slug) {
  return slug
    .split('-')
    .filter((w) => !/^(wmns|women|womens|mujer|dama|femenino|mens|men|hombre|masculino)$/.test(w))
    .join('-');
}

function readPrices() {
  const byFile = new Map();
  const byBrand = new Map();
  if (!existsSync(PRICES_FILE)) return { byFile, byBrand };

  const toNumber = (raw) => {
    const n = Number(String(raw ?? '').replace(/[^\d]/g, ''));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const lines = readFileSync(PRICES_FILE, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim() || line.startsWith('#') || /^archivo|^nombre/i.test(line)) continue;
    const [key, value, before] = line.split(/[,;]/);
    if (!key) continue;
    const price = toNumber(value);
    if (!price) continue;
    const entry = { price, before: toNumber(before) };
    const marca = key.trim().match(/^marca\s*:\s*(.+)$/i);
    if (marca) byBrand.set(marca[1].trim().toLowerCase(), entry);
    else byFile.set(slugify(key), entry);
  }
  return { byFile, byBrand };
}

/* ── Proceso ─────────────────────────────────────────────────────────────── */

if (!existsSync(PHOTO_DIR)) {
  console.error(`\nNo existe la carpeta ${relative(ROOT, PHOTO_DIR)}.`);
  console.error('Crea public/catalogo/ y copia ahí las fotos del catálogo.\n');
  process.exit(1);
}

const files = walk(PHOTO_DIR).sort();
if (!files.length) {
  console.error(`\nNo hay imágenes en ${relative(ROOT, PHOTO_DIR)}.\n`);
  process.exit(1);
}

const prices = readPrices();

/* Se combinan todos los ajustes/*.json. Si dos marcas usaran el mismo nombre
   de archivo el último ganaría, pero eso ya sería un choque de nombres que
   conviene resolver renombrando la foto. */
const overrides = {};
if (existsSync(OVERRIDES_DIR)) {
  for (const file of readdirSync(OVERRIDES_DIR)) {
    if (!file.endsWith('.json')) continue;
    Object.assign(overrides, JSON.parse(readFileSync(join(OVERRIDES_DIR, file), 'utf8')));
  }
}

/* Agrupar fotos por par. */
const groups = new Map();

for (const file of files) {
  const rel = relative(PHOTO_DIR, file);
  const folders = rel.split(sep).slice(0, -1).map((f) => f.toLowerCase());
  const rawName = basename(file, extname(file));
  const { base } = stripPhotoIndex(rawName);
  const fullSlug = slugify(base);

  const words = fullSlug.replace(/-/g, ' ');
  const haystack = `${folders.join(' ')} ${words}`;
  const brandFromFolder =
    folders.map((f) => BRAND_FOLDERS.get(f)).find(Boolean) ?? null;

  const gender = folders.some((f) => /mujer|women|dama/.test(f))
    ? 'mujer'
    : folders.some((f) => /hombre|\bmen\b/.test(f))
      ? 'hombre'
      : WOMEN_TOKENS.test(words)
        ? 'mujer'
        : MEN_TOKENS.test(words)
          ? 'hombre'
          : 'unisex';

  const category =
    LINEA_FORZADA ?? (folders.some((f) => /original/.test(f)) ? 'originales' : 'general');
  const key = stripGenderTokens(fullSlug) || fullSlug;

  // Ruta pública tal como la pedirá el navegador. `encodeURI` cubre espacios
  // y acentos que hayan quedado en los nombres de archivo.
  const publicPath = encodeURI(`/catalogo/${rel.split(sep).join('/')}`);

  if (!groups.has(key)) {
    groups.set(key, {
      key,
      images: [],
      gender,
      category,
      haystack,
      brandFromFolder,
      files: [],
    });
  }
  const group = groups.get(key);
  group.images.push(publicPath);
  group.files.push(rel);
  // La horma y la línea más específicas ganan sobre el valor por defecto.
  if (group.gender === 'unisex' && gender !== 'unisex') group.gender = gender;
  if (category === 'originales') group.category = 'originales';
}

/* ── Libro de llegadas ───────────────────────────────────────────────────
   Cuándo entró cada par al catálogo. No se puede deducir del sistema de
   archivos: las fotos vienen dentro de un zip y conservan su fecha original,
   que suele ser vieja, y copiarlas la arrastra. Tampoco de la hora de la
   corrida, que es la misma para los 236.

   Así que se anota: la primera vez que aparece una clave se le pone la fecha
   de hoy y queda escrita en llegadas.json. Las siguientes corridas respetan
   la que ya tenía. El archivo se versiona con el repo, de modo que el orden
   del altar es el mismo para todos y no depende de qué máquina generó. */
const llegadas = existsSync(ARRIVALS_FILE)
  ? JSON.parse(readFileSync(ARRIVALS_FILE, 'utf8'))
  : {};
const ahora = new Date().toISOString();
let llegadasNuevas = 0;

for (const key of groups.keys()) {
  if (!llegadas[key]) {
    llegadas[key] = ahora;
    llegadasNuevas++;
  }
}

// Se conservan solo los pares que siguen en el catálogo, para que el archivo
// no crezca con claves de fotos que ya se borraron.
const registro = Object.fromEntries(
  [...groups.keys()].sort().map((key) => [key, llegadas[key]]),
);
writeFileSync(ARRIVALS_FILE, `${JSON.stringify(registro, null, 2)}\n`, 'utf8');

/* La marca de cada par, resuelta una sola vez: hace falta antes de repartir
   el altar y otra vez al armar el producto. */
const marcaDe = new Map(
  [...groups.values()].map((group) => [
    group.key,
    overrides[group.key]?.brand ??
      group.brandFromFolder ??
      MARCA_FORZADA ??
      detectBrand(group.haystack),
  ]),
);

/* Lo último que entró es lo que va al altar de la portada, y lo que lleva el
   sello "Nuevo". Con el sello puesto a todo el catálogo dejaba de significar
   algo, así que se queda en una franja corta de los más recientes.

   Con tope por marca: un lote entero llega con la misma fecha, y sin el tope
   el altar —y el orden "Destacados" del catálogo, que sale del mismo flag—
   quedaban con ocho pares de la misma casa. */
const ALTAR = 8;
const NOVEDADES = 12;
const MAX_POR_MARCA = 3;
const porLlegada = [...groups.keys()].sort((a, b) =>
  registro[a] === registro[b]
    ? a.localeCompare(b, 'es')
    : registro[b].localeCompare(registro[a]),
);

const enElAltar = new Set();
const usadasPorMarca = new Map();
for (const key of porLlegada) {
  if (enElAltar.size === ALTAR) break;
  const marca = marcaDe.get(key);
  const usadas = usadasPorMarca.get(marca) ?? 0;
  if (usadas >= MAX_POR_MARCA) continue;
  usadasPorMarca.set(marca, usadas + 1);
  enElAltar.add(key);
}
// Con pocas marcas el tope puede dejar huecos: se llenan con lo siguiente.
for (const key of porLlegada) {
  if (enElAltar.size === ALTAR) break;
  enElAltar.add(key);
}

const recienLlegados = new Set(porLlegada.slice(0, NOVEDADES));

const sneakers = [];
const sinPrecio = [];
const marcasDudosas = [];

[...groups.values()].forEach((group) => {
  const ajuste = overrides[group.key] ?? {};
  const name = ajuste.name ?? prettifyName(group.key);
  const brand = marcaDe.get(group.key);
  const gender = ajuste.gender ?? group.gender;
  const category = ajuste.category ?? group.category;
  // "Otras" en la carpeta `otras/` es una decisión, no un fallo de detección:
  // son marcas con dos o tres referencias que no ameritan filtro propio.
  if (brand === 'Otras' && !ajuste.brand && !group.brandFromFolder) {
    marcasDudosas.push(name);
  }
  // El par manda sobre su marca, y la marca sobre las banderas del comando.
  const tarifa = prices.byFile.get(group.key) ?? prices.byBrand.get(brand.toLowerCase()) ?? {};
  const price = tarifa.price || PRECIO_BASE;
  const antes = tarifa.before || PRECIO_ANTES;
  if (!price) sinPrecio.push(group.key);

  const hash = createHash('sha1').update(group.key).digest('hex');
  const llegada = registro[group.key];

  sneakers.push({
    id: `sneaker-${group.key}`.slice(0, 78),
    name,
    brand,
    model: name,
    sku: `PAPI-${parseInt(hash.slice(0, 6), 16).toString().slice(0, 4).padStart(4, '0')}`,
    category,
    gender,
    price,
    originalPrice: antes > price ? antes : undefined,
    images: group.images,
    sizes: SIZES_BY_GENDER[gender],
    status: 'disponible',
    isFeatured: enElAltar.has(group.key),
    isNewArrival: recienLlegados.has(group.key),
    isOriginalCertified: category === 'originales',
    description: ajuste.description ?? '',
    details: {
      condition: ajuste.condition ?? 'Nuevo en caja',
      colorway: ajuste.colorway ?? '',
      includedItems: ['Caja original'],
    },
    viewsCount: 0,
    inquiriesCount: 0,
    createdAt: llegada,
    updatedAt: llegada,
  });
});

sneakers.sort((a, b) => a.name.localeCompare(b.name, 'es'));

writeFileSync(
  OUTPUT_FILE,
  JSON.stringify(
    { version: 3, exportedAt: new Date().toISOString(), sneakers, deliveries: [] },
    null,
    2,
  ),
  'utf8',
);

/* El JSON de arriba solo entra al navegador de quien lo importe. Para que el
   catálogo lo vean los clientes en el sitio publicado tiene que estar también
   en el código, así que se escribe como módulo TypeScript. */
writeFileSync(
  TS_OUTPUT_FILE,
  `/**
 * ARCHIVO GENERADO — no lo edites a mano.
 *
 * Lo escribe scripts/generar-catalogo.mjs a partir de las fotos de
 * public/catalogo/ y de ajustes.json. Vuelve a correr:
 *
 *   npm run catalogo -- --marca=Adidas --precio=180000 --antes=210000
 *
 * Los cambios que hagas desde el panel viven en el localStorage de tu
 * navegador y tienen prioridad sobre este archivo.
 */

import type { Sneaker } from '../types';

export const CATALOGO_GENERADO: Sneaker[] = ${JSON.stringify(sneakers, null, 2)};
`,
  'utf8',
);

/* ── Informe ─────────────────────────────────────────────────────────────── */

const porLinea = {
  originales: sneakers.filter((s) => s.category === 'originales').length,
  sneakers: sneakers.filter((s) => s.category === 'general').length,
};
const porHorma = {
  unisex: sneakers.filter((s) => s.gender === 'unisex').length,
  hombre: sneakers.filter((s) => s.gender === 'hombre').length,
  mujer: sneakers.filter((s) => s.gender === 'mujer').length,
};

console.log(`\n${files.length} fotos → ${sneakers.length} pares\n`);
console.log(`  Originales: ${porLinea.originales}   Sneakers: ${porLinea.sneakers}`);
console.log(
  `  Unisex: ${porHorma.unisex}   Hombre: ${porHorma.hombre}   Mujer: ${porHorma.mujer}`,
);

const porMarca = new Map();
for (const s of sneakers) porMarca.set(s.brand, (porMarca.get(s.brand) ?? 0) + 1);
console.log(
  `  ${[...porMarca.entries()].sort((a, b) => b[1] - a[1]).map(([m, n]) => `${m}: ${n}`).join('   ')}\n`,
);

for (const s of sneakers) {
  const precio = s.price ? `$${s.price.toLocaleString('es-CO')}` : 'SIN PRECIO';
  console.log(
    `  ${s.name}\n    ${s.brand} · ${s.category === 'originales' ? 'Originales' : 'Sneakers'} · ${s.gender} · ${s.images.length} foto(s) · ${precio}`,
  );
}

if (marcasDudosas.length) {
  console.log(`\n⚠ Sin marca detectada (${marcasDudosas.length}), revísalos en el panel:`);
  for (const nombre of marcasDudosas.sort((a, b) => a.localeCompare(b, 'es'))) {
    console.log(`    ${nombre}`);
  }
}

/* Pares cuyo nombre solo se diferencia en un número final: casi siempre son
   fotos del mismo modelo que quedaron como productos separados. */
const posiblesSeries = new Map();
for (const key of groups.keys()) {
  const match = key.match(/^(.+?)-(\d{1,2})$/);
  if (!match) continue;
  const raiz = match[1];
  if (!groups.has(raiz) && ![...groups.keys()].some((k) => k !== key && k.startsWith(`${raiz}-`) && /^\d{1,2}$/.test(k.slice(raiz.length + 1)))) {
    continue;
  }
  if (!posiblesSeries.has(raiz)) posiblesSeries.set(raiz, new Set());
  posiblesSeries.get(raiz).add(key);
  if (groups.has(raiz)) posiblesSeries.get(raiz).add(raiz);
}

const series = [...posiblesSeries.entries()].filter(([, set]) => set.size > 1);
if (series.length) {
  console.log('\n⚠ Estos nombres solo se diferencian en el número final:');
  for (const [raiz, set] of series) {
    console.log(`    ${[...set].join(', ')}`);
    console.log(
      `      Si son fotos del mismo par, renómbralas ${raiz}_1, ${raiz}_2… y vuelve a correr el script.`,
    );
  }
}

if (sinPrecio.length) {
  console.log(`\n⚠ Sin precio (${sinPrecio.length}). Agrégalos a precios.csv:`);
  for (const key of sinPrecio) console.log(`    ${key},`);
}

console.log(`\n✓ ${relative(ROOT, TS_OUTPUT_FILE)}`);
console.log('  Es el catálogo que verán los clientes en el sitio publicado.');
console.log(`\n✓ ${relative(ROOT, OUTPUT_FILE)}`);
console.log('  Impórtalo en Panel › Ajustes › Restaurar respaldo para verlo en');
console.log('  tu navegador, que ya tiene datos guardados. Exporta un respaldo antes.\n');
