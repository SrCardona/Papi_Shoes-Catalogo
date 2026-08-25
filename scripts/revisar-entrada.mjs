/**
 * REVISION DE LA BANDEJA DE ENTRADA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Primer paso al cargar fotos nuevas: separa lo que ya está en el catálogo de
 * lo que hay que clasificar.
 *
 *   node scripts/revisar-entrada.mjs
 *
 * Compara el SHA-256 del contenido de cada foto de `public/catalogo/_entrada/`
 * contra todas las fotos ya publicadas en `public/catalogo/`, y también entre
 * ellas mismas (WhatsApp reenvía la misma imagen varias veces en un lote).
 *
 * El hash solo detecta archivos byte a byte idénticos. Una foto reguardada con
 * otra compresión pasa como nueva: eso es a propósito. Un hash perceptual
 * confundiría dos colorways parecidos del mismo modelo, y en este catálogo esa
 * confusión cuesta más que revisar una foto de más.
 *
 * Salida JSON con `--json`, para leerla desde otra herramienta.
 */

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname, sep } from 'node:path';

const ROOT = process.cwd();
const PHOTO_DIR = join(ROOT, 'public', 'catalogo');
const INBOX_DIR = join(PHOTO_DIR, '_entrada');
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.jfif']);
const JSON_OUT = process.argv.includes('--json');

function esImagen(nombre) {
  return IMAGE_EXT.has(extname(nombre).toLowerCase());
}

/** Recorre el catálogo publicado, saltando las bandejas de trabajo (`_*`). */
function walkCatalogo(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.') || entry.startsWith('_')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkCatalogo(full, acc);
    else if (esImagen(entry)) acc.push(full);
  }
  return acc;
}

function hash(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function rutaRel(file) {
  return relative(ROOT, file).split(sep).join('/');
}

if (!existsSync(INBOX_DIR)) {
  console.error(`\nNo existe ${rutaRel(INBOX_DIR)}. Créala y copia ahí las fotos nuevas.\n`);
  process.exit(1);
}

const entrantes = readdirSync(INBOX_DIR)
  .filter((e) => !e.startsWith('.') && esImagen(e))
  .sort()
  .map((e) => join(INBOX_DIR, e));

/* El catálogo se indexa por hash: un mismo archivo puede estar en dos marcas y
   queremos nombrarlas todas al reportar el choque. */
const porHash = new Map();
for (const file of walkCatalogo(PHOTO_DIR)) {
  const h = hash(file);
  if (!porHash.has(h)) porHash.set(h, []);
  porHash.get(h).push(rutaRel(file));
}

const duplicados = [];
const nuevas = [];
const vistos = new Map();

for (const file of entrantes) {
  const h = hash(file);
  const nombre = relative(INBOX_DIR, file);
  const enCatalogo = porHash.get(h);

  if (enCatalogo) {
    duplicados.push({ nombre, hash: h, choca: enCatalogo, motivo: 'ya está en el catálogo' });
  } else if (vistos.has(h)) {
    duplicados.push({ nombre, hash: h, choca: [vistos.get(h)], motivo: 'repetida en la bandeja' });
  } else {
    vistos.set(h, nombre);
    nuevas.push({ nombre, hash: h, bytes: statSync(file).size });
  }
}

if (JSON_OUT) {
  console.log(JSON.stringify({ entrantes: entrantes.length, duplicados, nuevas }, null, 2));
  process.exit(0);
}

console.log(`\nBandeja: ${entrantes.length} foto(s) en ${rutaRel(INBOX_DIR)}`);
console.log(`Catálogo publicado: ${porHash.size} imagen(es) distintas.\n`);

if (duplicados.length) {
  console.log(`DUPLICADAS — ${duplicados.length}. No se procesan; bórralas tú.`);
  for (const d of duplicados) {
    console.log(`  · ${d.nombre}`);
    console.log(`      ${d.motivo} → ${d.choca.join(', ')}`);
  }
  console.log('');
}

if (nuevas.length) {
  console.log(`POR CLASIFICAR — ${nuevas.length}`);
  for (const n of nuevas) console.log(`  · ${n.nombre}  (${Math.round(n.bytes / 1024)} KB)`);
  console.log('');
} else {
  console.log('No queda nada por clasificar.\n');
}
