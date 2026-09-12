/**
 * GENERADOR DEL MURO DE ENTREGAS A PARTIR DE LAS FOTOS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Las entregas del muro "Ya están en la calle" solo podían nacer en el panel, y
 * eso las dejaba viviendo en el `localStorage` del navegador del dueño: si la
 * nube no estaba publicada, ningún otro equipo las veía. Aquí se les da el
 * mismo camino que al catálogo —fotos en el repositorio, datos en un JSON— para
 * que viajen dentro del sitio y se vean en cualquier dispositivo sin depender
 * de la nube, del panel ni de una sesión abierta.
 *
 *   npm run entregas
 *
 * CÓMO ORGANIZAR LAS FOTOS
 * ────────────────────────
 *   public/entregas/
 *     _entrada/                      ← bandeja: fotos como las manda el cliente
 *     medellin-laureles-aj1.jpg      ← ya clasificada, con nombre en minúsculas
 *
 * Las carpetas que empiezan por `_` se saltan, igual que en el catálogo: lo que
 * esté en `_entrada/` no sale publicado hasta que se le ponga nombre y datos.
 *
 * LOS DATOS DE CADA ENTREGA
 * ─────────────────────────
 * En `catalogo/entregas.json`, por nombre de archivo sin extensión. Mismas
 * claves que el tipo `Delivery`, para que no haya que traducir nada:
 *
 *   {
 *     "medellin-laureles-aj1": {
 *       "city": "Medellín",
 *       "neighborhood": "Laureles",
 *       "productName": "Air Jordan 1 High OG UNC Toe",
 *       "note": "Entrega en mano, talla 42.",
 *       "deliveredAt": "2026-07-28",
 *       "locationInImage": false
 *     }
 *   }
 *
 * `city` es lo único obligatorio: sin ciudad el validador descarta la entrega,
 * así que el script avisa y no la genera en vez de inventarse una. Sin
 * `deliveredAt` se usa la fecha del archivo y se reporta cuáles fueron.
 *
 * `locationInImage` en `true` cuando la foto YA trae la ubicación escrita
 * encima: el sitio deja entonces de dibujar su propio rótulo para no repetirla.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, extname, join, relative, sep } from 'node:path';

const ROOT = process.cwd();

const PHOTO_DIR = join(ROOT, 'public', 'entregas');
const CATALOG_DIR = join(ROOT, 'catalogo');
const DATA_FILE = join(CATALOG_DIR, 'entregas.json');
const TS_OUTPUT_FILE = join(ROOT, 'src', 'data', 'entregasGeneradas.ts');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

/* ── Lectura ─────────────────────────────────────────────────────────────── */

if (!existsSync(PHOTO_DIR)) {
  mkdirSync(join(PHOTO_DIR, '_entrada'), { recursive: true });
  console.log(`\nSe creó ${relative(ROOT, PHOTO_DIR)}. Deja ahí las fotos de las entregas.\n`);
}

/** Las carpetas que empiezan por `_` son bandeja o trabajo en curso. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (IMAGE_EXT.has(extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

const datos = existsSync(DATA_FILE)
  ? JSON.parse(readFileSync(DATA_FILE, 'utf8'))
  : {};

const files = existsSync(PHOTO_DIR) ? walk(PHOTO_DIR).sort() : [];

/* ── Armado ──────────────────────────────────────────────────────────────── */

/** Fecha en ISO desde `2026-07-28` o desde un ISO completo. */
function aIso(valor) {
  if (typeof valor !== 'string' || !valor.trim()) return null;
  const fecha = new Date(/^\d{4}-\d{2}-\d{2}$/.test(valor) ? `${valor}T12:00:00Z` : valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

const entregas = [];
const sinCiudad = [];
const sinFecha = [];

for (const file of files) {
  const clave = basename(file, extname(file));
  const ajuste = datos[clave] ?? {};

  const city = typeof ajuste.city === 'string' ? ajuste.city.trim() : '';
  if (!city) {
    sinCiudad.push(clave);
    continue;
  }

  const fechaAjuste = aIso(ajuste.deliveredAt);
  if (!fechaAjuste) sinFecha.push(clave);
  const deliveredAt = fechaAjuste ?? statSync(file).mtime.toISOString();

  /* La ruta es la URL: `public/` es la raíz que sirve el sitio. Se normalizan
     las barras porque en Windows `join` devuelve `\`. */
  const image = `/${relative(join(ROOT, 'public'), file).replaceAll(sep, '/')}`;

  entregas.push({
    id: `entrega-${clave}`,
    image,
    city,
    neighborhood:
      typeof ajuste.neighborhood === 'string' ? ajuste.neighborhood.trim() : '',
    ...(ajuste.productName ? { productName: String(ajuste.productName).trim() } : {}),
    ...(ajuste.note ? { note: String(ajuste.note).trim() } : {}),
    deliveredAt,
    locationInImage: ajuste.locationInImage === true,
    createdAt: deliveredAt,
  });
}

/* De la más reciente a la más antigua, que es como las muestra el muro. */
entregas.sort((a, b) => Date.parse(b.deliveredAt) - Date.parse(a.deliveredAt));

/* ── Salida ──────────────────────────────────────────────────────────────── */

mkdirSync(join(ROOT, 'src', 'data'), { recursive: true });
writeFileSync(
  TS_OUTPUT_FILE,
  `/**
 * ARCHIVO GENERADO — no lo edites a mano.
 *
 * Lo escribe scripts/generar-entregas.mjs a partir de las fotos de
 * public/entregas/ y de catalogo/entregas.json. Vuelve a correr:
 *
 *   npm run entregas
 *
 * Estas son las entregas que ve cualquier visitante en cualquier equipo, sin
 * pasar por la nube. Las que se agregan desde el panel viven aparte y mandan
 * sobre estas en el navegador donde se crearon.
 */

import type { Delivery } from '../types';

export const ENTREGAS_GENERADAS: Delivery[] = ${JSON.stringify(entregas, null, 2)};
`,
  'utf8',
);

/* ── Informe ─────────────────────────────────────────────────────────────── */

console.log(`\n${files.length} fotos → ${entregas.length} entregas\n`);

const porCiudad = new Map();
for (const e of entregas) porCiudad.set(e.city, (porCiudad.get(e.city) ?? 0) + 1);
if (porCiudad.size) {
  console.log(
    `  ${[...porCiudad.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([c, n]) => `${c}: ${n}`)
      .join('   ')}\n`,
  );
}

if (sinCiudad.length) {
  console.log(`⚠ Sin ciudad (${sinCiudad.length}); no se publican. Agrégalas a ${relative(ROOT, DATA_FILE)}:`);
  for (const clave of sinCiudad) {
    console.log(`    "${clave}": { "city": "", "neighborhood": "", "deliveredAt": "" },`);
  }
  console.log('');
}

if (sinFecha.length) {
  console.log(`⚠ Sin fecha (${sinFecha.length}); se usó la del archivo: ${sinFecha.join(', ')}\n`);
}

const bandeja = join(PHOTO_DIR, '_entrada');
if (existsSync(bandeja)) {
  const pendientes = readdirSync(bandeja).filter((n) =>
    IMAGE_EXT.has(extname(n).toLowerCase()),
  );
  if (pendientes.length) {
    console.log(`⚠ Quedan ${pendientes.length} fotos en ${relative(ROOT, bandeja)} sin clasificar.\n`);
  }
}

console.log(`✓ ${relative(ROOT, TS_OUTPUT_FILE)}`);
console.log('  Se ven en todos los dispositivos en cuanto despliegues.\n');
