/**
 * RESCATA LAS ENTREGAS DE UN RESPALDO DEL PANEL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Las entregas creadas desde el panel viven en el `localStorage` del navegador
 * que las creó, con la foto incrustada en base64. Mientras no se publiquen en
 * la nube no existen en ningún otro lado, así que no hay forma de llevarlas a
 * otro equipo ni de guardarlas en el repositorio.
 *
 * Esto las saca de ahí: toma el archivo de Panel › Ajustes › Exportar respaldo,
 * escribe cada foto en `public/entregas/` y sus datos en
 * `catalogo/entregas.json`, que es lo que lee `npm run entregas`.
 *
 *   node scripts/importar-entregas.mjs --archivo=descargas/papi-shoes-2026-09-12.json
 *   npm run entregas
 *
 * Del respaldo solo se lee `deliveries`. Los ajustes NO se tocan a propósito:
 * ese bloque incluye el usuario y el hash del PIN del panel, y este repositorio
 * es público. Nada de eso tiene por qué pasar por aquí.
 *
 * No pisa nada: una entrega cuya foto ya esté escrita se salta y se reporta, y
 * lo que ya esté en `catalogo/entregas.json` se conserva.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';

const ROOT = process.cwd();

const PHOTO_DIR = join(ROOT, 'public', 'entregas');
const CATALOG_DIR = join(ROOT, 'catalogo');
const DATA_FILE = join(CATALOG_DIR, 'entregas.json');

const flags = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [key, value = 'true'] = a.replace(/^--/, '').split('=');
      return [key, value];
    }),
);

if (!flags.archivo) {
  console.log('\nFalta el respaldo. Úsalo así:\n');
  console.log('  node scripts/importar-entregas.mjs --archivo=ruta/al/papi-shoes-2026-09-12.json\n');
  console.log('El archivo sale de Panel › Ajustes › Exportar respaldo.\n');
  process.exit(1);
}

/* El respaldo suele estar en Descargas, así que la ruta llega absoluta; `join`
   la pegaría detrás del proyecto y no la encontraría. */
const ORIGEN = isAbsolute(flags.archivo) ? flags.archivo : join(ROOT, flags.archivo);
if (!existsSync(ORIGEN)) {
  console.log(`\nNo encuentro ${flags.archivo}\n`);
  process.exit(1);
}

/* ── Lectura ─────────────────────────────────────────────────────────────── */

const respaldo = JSON.parse(readFileSync(ORIGEN, 'utf8'));
const entregas = Array.isArray(respaldo.deliveries) ? respaldo.deliveries : [];

if (!entregas.length) {
  console.log('\nEse respaldo no trae entregas.\n');
  process.exit(0);
}

const EXT_POR_TIPO = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
};

/** Nombre de archivo a partir de ciudad y barrio: legible y sin sorpresas. */
function slug(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** `2026-07-28T00:00:00.000Z` → `2026-07-28`, que es como se edita a mano. */
function soloFecha(iso) {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime())
    ? new Date().toISOString().slice(0, 10)
    : fecha.toISOString().slice(0, 10);
}

/* ── Escritura ───────────────────────────────────────────────────────────── */

mkdirSync(join(PHOTO_DIR, '_entrada'), { recursive: true });
mkdirSync(CATALOG_DIR, { recursive: true });

const datos = existsSync(DATA_FILE)
  ? JSON.parse(readFileSync(DATA_FILE, 'utf8'))
  : {};

const escritas = [];
const yaEstaban = [];
const sinFoto = [];
const porUrl = [];
const usados = new Set(Object.keys(datos));

for (const entrega of entregas) {
  const ciudad = String(entrega.city ?? '').trim();
  if (!ciudad) {
    sinFoto.push('(entrega sin ciudad)');
    continue;
  }

  const base =
    [slug(ciudad), slug(entrega.neighborhood), slug(entrega.productName)]
      .filter(Boolean)
      .join('-')
      .slice(0, 70) || 'entrega';

  /* Dos entregas del mismo barrio no pueden pisarse: la segunda lleva sufijo. */
  let clave = base;
  let n = 2;
  while (usados.has(clave)) clave = `${base}-${n++}`;

  const imagen = String(entrega.image ?? '');
  const coincide = imagen.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);

  if (!coincide) {
    /* Una foto que ya es URL (del almacén o de fuera) no hay que escribirla:
       se anota tal cual y el generador la usa como está. */
    if (/^https?:\/\//i.test(imagen) || imagen.startsWith('/')) {
      porUrl.push({ clave, entrega, imagen });
    } else {
      sinFoto.push(clave);
    }
    continue;
  }

  const extension = EXT_POR_TIPO[coincide[1].toLowerCase()];
  if (!extension) {
    sinFoto.push(`${clave} (formato ${coincide[1]})`);
    continue;
  }

  const destino = join(PHOTO_DIR, `${clave}${extension}`);
  if (existsSync(destino)) {
    yaEstaban.push(clave);
    continue;
  }

  writeFileSync(destino, Buffer.from(coincide[2], 'base64'));
  usados.add(clave);
  escritas.push(clave);

  datos[clave] = {
    city: ciudad,
    neighborhood: String(entrega.neighborhood ?? '').trim(),
    ...(entrega.productName ? { productName: String(entrega.productName).trim() } : {}),
    ...(entrega.note ? { note: String(entrega.note).trim() } : {}),
    deliveredAt: soloFecha(entrega.deliveredAt),
    locationInImage: entrega.locationInImage === true,
  };
}

writeFileSync(DATA_FILE, `${JSON.stringify(datos, null, 2)}\n`, 'utf8');

/* ── Informe ─────────────────────────────────────────────────────────────── */

console.log(`\n${entregas.length} entregas en el respaldo\n`);
console.log(`  ${escritas.length} fotos escritas en ${relative(ROOT, PHOTO_DIR)}`);
if (yaEstaban.length) console.log(`  ${yaEstaban.length} ya estaban y no se tocaron`);
if (porUrl.length) {
  console.log(`\n⚠ ${porUrl.length} entregas traen la foto por URL, no incrustada.`);
  console.log('  Descárgalas a mano y déjalas en public/entregas/ con estos nombres:');
  for (const { clave, imagen } of porUrl) {
    console.log(`    ${clave}  ←  ${imagen.slice(0, 80)}`);
  }
}
if (sinFoto.length) {
  console.log(`\n⚠ ${sinFoto.length} sin foto utilizable: ${sinFoto.join(', ')}`);
}

console.log(`\n✓ ${relative(ROOT, DATA_FILE)}`);
console.log('  Revisa ciudad, barrio y fecha, y luego corre:  npm run entregas\n');
