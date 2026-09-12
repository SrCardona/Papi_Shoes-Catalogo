/**
 * GENERADOR DEL MURO DE ENTREGAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Convierte el JSON que baja Panel › Entregas › "Exportar entregas" en fotos
 * de verdad dentro del repositorio y en `src/data/entregasGeneradas.ts`.
 *
 *   npm run entregas
 *   npm run entregas -- --archivo=descargas/papi-shoes-entregas-2026-09-12.json
 *
 * POR QUÉ EXISTE
 * ──────────────
 * Una entrega creada en el panel vive en el `localStorage` de ese navegador,
 * con la foto incrustada en base64. Mientras no salga de ahí, los clientes ven
 * lo que traiga el código y no lo que subió el dueño. Esto le da a las entregas
 * el mismo camino que al catálogo: archivos en `public/`, datos en un `.ts`
 * generado, y todo viaja dentro del sitio sin depender de la nube.
 *
 * BANDERAS
 * ────────
 *   --archivo=ruta     El JSON exportado. Por defecto
 *                      `catalogo/entregas-exportadas.json`.
 *   --limpiar          Borra de public/entregas/ las fotos que ya no usa
 *                      ninguna entrega. Sin la bandera solo las reporta.
 *
 * NOMBRE DE CADA FOTO
 * ───────────────────
 *   sabaneta-alto-las-flores-2026-08-3f9a1c72.jpg
 *   └── ciudad y barrio ──┘ └─ mes ─┘ └─ hash ─┘
 *
 * El hash es del contenido, y va en el nombre a propósito: si se reemplaza la
 * foto de una entrega y la ruta no cambia, el navegador sigue pintando la
 * vieja durante una hora larga. Con el hash, otra foto es otra URL.
 *
 * RECOMPRESIÓN
 * ────────────
 * Las fotos ya llegan tratadas: `compressImageFile` las reduce en el navegador
 * a 1400 px de borde mayor y JPEG al 72% antes de guardarlas. Este script
 * vuelve a aplicar ese mismo criterio solo si encuentra `sharp` instalado
 * (`npm i -D sharp`), porque en Node no hay canvas. Sin `sharp` no recomprime
 * nada: reporta las que pasen del tope y las escribe tal cual, que es mejor que
 * publicar una foto reventada.
 */
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { extname, isAbsolute, join, relative } from 'node:path';

const ROOT = process.cwd();

const PHOTO_DIR = join(ROOT, 'public', 'entregas');
const CATALOG_DIR = join(ROOT, 'catalogo');
const DEFAULT_INPUT = join(CATALOG_DIR, 'entregas-exportadas.json');
const TS_OUTPUT_FILE = join(ROOT, 'src', 'data', 'entregasGeneradas.ts');

/* Mismo criterio que `compressImageFile` en src/lib/utils.ts. */
const MAX_EDGE = 1400;
const JPEG_QUALITY = 72;
/* Por encima de esto se avisa: una foto del panel bien tratada no llega ahí. */
const PESO_SOSPECHOSO = 400 * 1024;

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

const EXT_POR_TIPO = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
};

const flags = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [key, value = 'true'] = a.replace(/^--/, '').split('=');
      return [key, value];
    }),
);

/* ── Entrada ─────────────────────────────────────────────────────────────── */

const INPUT = flags.archivo
  ? isAbsolute(flags.archivo)
    ? flags.archivo
    : join(ROOT, flags.archivo)
  : DEFAULT_INPUT;

if (!existsSync(INPUT)) {
  console.log(`\nNo encuentro ${relative(ROOT, INPUT)}\n`);
  console.log('Bájalo desde Panel › Entregas › "Exportar entregas" y déjalo ahí,');
  console.log('o pásale la ruta:\n');
  console.log(
    '  npm run entregas -- --archivo=C:/Users/tu-usuario/Downloads/papi-shoes-entregas-2026-09-12.json\n',
  );
  process.exit(1);
}

const respaldo = JSON.parse(readFileSync(INPUT, 'utf8'));
/* Sirve tanto el export de entregas como el respaldo completo del panel: los
   dos traen la lista en `deliveries`. */
const entrada = Array.isArray(respaldo) ? respaldo : respaldo.deliveries ?? [];

if (!Array.isArray(entrada) || !entrada.length) {
  console.log(`\n${relative(ROOT, INPUT)} no trae entregas.\n`);
  process.exit(0);
}

/* ── Utilidades ──────────────────────────────────────────────────────────── */

function slug(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** `2026-08-15T…` → `2026-08`: en el muro solo se muestra mes y año. */
function mesDe(iso) {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime())
    ? new Date().toISOString().slice(0, 7)
    : fecha.toISOString().slice(0, 7);
}

function fechaIso(iso) {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime())
    ? new Date().toISOString()
    : fecha.toISOString();
}

/* `sharp` es opcional: si no está, no se recomprime y se dice en el informe. */
let sharp = null;
try {
  ({ default: sharp } = await import('sharp'));
} catch {
  sharp = null;
}

async function recomprime(bytes, extension) {
  if (!sharp || extension === '.gif') return { bytes, tocada: false };
  try {
    const salida = await sharp(bytes)
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
    /* Si recomprimir no ayudó, nos quedamos con la original: es exactamente lo
       que hace `compressImageFile` en el navegador. */
    return salida.length < bytes.length
      ? { bytes: salida, tocada: true }
      : { bytes, tocada: false };
  } catch {
    return { bytes, tocada: false };
  }
}

/* ── Armado ──────────────────────────────────────────────────────────────── */

mkdirSync(PHOTO_DIR, { recursive: true });

const entregas = [];
const escritas = [];
const pesadas = [];
const porUrl = [];
const sinFoto = [];
const usados = new Set();
let recomprimidas = 0;

for (const entrega of entrada) {
  const city = String(entrega.city ?? '').trim();
  if (!city) {
    sinFoto.push('(entrega sin ciudad)');
    continue;
  }

  const deliveredAt = fechaIso(entrega.deliveredAt);
  const imagen = String(entrega.image ?? '');
  const incrustada = imagen.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);

  let image = imagen;

  if (incrustada) {
    const extensionOriginal = EXT_POR_TIPO[incrustada[1].toLowerCase()];
    if (!extensionOriginal) {
      sinFoto.push(`${city} (formato ${incrustada[1]})`);
      continue;
    }

    const original = Buffer.from(incrustada[2], 'base64');
    const { bytes, tocada } = await recomprime(original, extensionOriginal);
    if (tocada) recomprimidas++;
    const extension = tocada ? '.jpg' : extensionOriginal;

    if (bytes.length > PESO_SOSPECHOSO) {
      pesadas.push({ city, kb: Math.round(bytes.length / 1024) });
    }

    /* El nombre dice de qué entrega es; el hash, de qué versión de la foto. */
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 8);
    const base =
      [slug(city), slug(entrega.neighborhood), mesDe(deliveredAt)]
        .filter(Boolean)
        .join('-')
        .slice(0, 70) || 'entrega';

    /* Dos entregas del mismo barrio y mes no se pisan porque el hash las
       separa; y si fuera la misma foto, compartir archivo es lo correcto. */
    const nombre = `${base}-${hash}${extension}`;
    if (!usados.has(nombre)) {
      writeFileSync(join(PHOTO_DIR, nombre), bytes);
      escritas.push(nombre);
      usados.add(nombre);
    }
    image = `/entregas/${nombre}`;
  } else if (/^https?:\/\//i.test(imagen) || imagen.startsWith('/')) {
    /* Una foto que ya es URL se queda como está: no hay base64 que extraer. */
    porUrl.push({ city, imagen });
  } else {
    sinFoto.push(city);
    continue;
  }

  entregas.push({
    id:
      String(entrega.id ?? '').trim() ||
      `entrega-${slug(city)}-${entregas.length + 1}`,
    image,
    city,
    neighborhood: String(entrega.neighborhood ?? '').trim(),
    ...(entrega.productName
      ? { productName: String(entrega.productName).trim() }
      : {}),
    ...(entrega.note ? { note: String(entrega.note).trim() } : {}),
    deliveredAt,
    locationInImage: entrega.locationInImage === true,
    createdAt: fechaIso(entrega.createdAt ?? deliveredAt),
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
 * Lo escribe scripts/generar-entregas.mjs a partir del JSON que baja
 * Panel › Entregas › "Exportar entregas". Vuelve a correr:
 *
 *   npm run entregas
 *
 * Estas son las entregas que ve cualquier visitante, en cualquier equipo, sin
 * pasar por la nube. Las que se creen desde el panel viven en ese navegador y
 * mandan sobre estas hasta que se exporten y se vuelva a generar.
 */

import type { Delivery } from '../types';

export const ENTREGAS_GENERADAS: Delivery[] = ${JSON.stringify(entregas, null, 2)};
`,
  'utf8',
);

/* ── Huérfanas ───────────────────────────────────────────────────────────── */

const enUso = new Set(entregas.map((e) => e.image.replace('/entregas/', '')));
const huerfanas = readdirSync(PHOTO_DIR).filter(
  (n) => IMAGE_EXT.has(extname(n).toLowerCase()) && !enUso.has(n),
);

if (huerfanas.length && flags.limpiar) {
  for (const nombre of huerfanas) rmSync(join(PHOTO_DIR, nombre));
}

/* ── Informe ─────────────────────────────────────────────────────────────── */

const ciudades = new Map();
for (const e of entregas) ciudades.set(e.city, (ciudades.get(e.city) ?? 0) + 1);

const pesoTotal = readdirSync(PHOTO_DIR)
  .filter((n) => IMAGE_EXT.has(extname(n).toLowerCase()))
  .reduce((suma, n) => suma + statSync(join(PHOTO_DIR, n)).size, 0);

const resumenCiudades = [...ciudades.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([c, n]) => `${c}: ${n}`)
  .join('   ');

console.log(
  `\n${entrada.length} entregas en el archivo → ${entregas.length} publicadas\n`,
);
console.log(`  ${ciudades.size} ciudades — ${resumenCiudades}`);
console.log(`  ${escritas.length} fotos escritas en ${relative(ROOT, PHOTO_DIR)}`);
console.log(`  ${(pesoTotal / 1024 / 1024).toFixed(2)} MB en total`);
if (recomprimidas) {
  console.log(`  ${recomprimidas} recomprimidas a ${MAX_EDGE}px / JPEG ${JPEG_QUALITY}%`);
}

if (!sharp && pesadas.length) {
  console.log(
    `\n⚠ ${pesadas.length} fotos pasan de ${Math.round(PESO_SOSPECHOSO / 1024)} KB y no se recomprimieron (falta sharp):`,
  );
  for (const { city, kb } of pesadas) console.log(`    ${city}: ${kb} KB`);
  console.log('  Para recomprimirlas:  npm i -D sharp   y vuelve a correr.');
}

if (porUrl.length) {
  console.log(`\n⚠ ${porUrl.length} entregas apuntan a una URL y no a una foto propia:`);
  for (const { city, imagen } of porUrl) console.log(`    ${city}: ${imagen.slice(0, 70)}`);
  console.log('  Siguen dependiendo de ese servidor. Vuelve a subirlas desde el panel.');
}

if (sinFoto.length) {
  console.log(`\n⚠ ${sinFoto.length} sin foto utilizable: ${sinFoto.join(', ')}`);
}

if (huerfanas.length) {
  console.log(
    flags.limpiar
      ? `\n✓ ${huerfanas.length} fotos viejas borradas de ${relative(ROOT, PHOTO_DIR)}`
      : `\n⚠ ${huerfanas.length} fotos ya no las usa ninguna entrega. Para borrarlas:  npm run entregas -- --limpiar`,
  );
}

console.log(`\n✓ ${relative(ROOT, TS_OUTPUT_FILE)}`);
console.log('  Haz commit de eso y de public/entregas/: ahí quedan publicadas.\n');
