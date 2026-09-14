import fs from 'node:fs';
import {
  agruparMarcas, marcasVisiblesDelGrupo, esGrupoOtras,
  MINIMO_PARA_APARTADO_PROPIO, MARCA_OTRAS,
} from '../src/lib/marcas.ts';

const src = fs.readFileSync(new URL('../src/data/catalogoGenerado.ts', import.meta.url),'utf8');
const arr = JSON.parse(src.slice(src.indexOf('Sneaker[] = ')+12, src.lastIndexOf('];')+1));

console.log(`umbral = ${MINIMO_PARA_APARTADO_PROPIO}, centinela = "${MARCA_OTRAS}"`);
console.log('esGrupoOtras: "otras"=%s  "Otras"=%s  " OTRAS "=%s  "Nike"=%s',
  esGrupoOtras('otras'), esGrupoOtras('Otras'), esGrupoOtras(' OTRAS '), esGrupoOtras('Nike'));

let fallos = 0;
const alcanzables = new Set();

for (const [cat, nombre] of [['general','SNEAKERS'],['originales','ORIGINALES']]) {
  const linea = arr.filter(s => s.category === cat);
  const { principales, otras } = agruparMarcas(arr, cat);
  console.log(`\n${'='.repeat(56)}\n${nombre} — ${linea.length} pares\n${'='.repeat(56)}`);

  let suma = 0;
  for (const m of principales) {
    const real = linea.filter(s => s.brand.toLowerCase() === m.brand.toLowerCase());
    if (real.length !== m.count) { fallos++; console.log(`  XX ${m.brand}: menu ${m.count}, catalogo ${real.length}`); }
    else console.log(`  ok ${String(m.count).padStart(4)}  ${m.brand}`);
    suma += m.count;
    real.forEach(s => alcanzables.add(s.id));
  }

  if (otras.count > 0) {
    const real = linea.filter(s => otras.brands.some(b => b.toLowerCase() === s.brand.toLowerCase()));
    if (real.length !== otras.count) { fallos++; console.log(`  XX Otras marcas: menu ${otras.count}, catalogo ${real.length}`); }
    else console.log(`  ok ${String(otras.count).padStart(4)}  Otras marcas`);
    const { nombres, restoSinMarca } = marcasVisiblesDelGrupo(otras);
    console.log(`        Incluye ${[...nombres, ...(restoSinMarca?['marcas sueltas']:[])].join(', ')}`);
    suma += otras.count;
    real.forEach(s => alcanzables.add(s.id));
  } else {
    console.log('  --     0  sin grupo: la entrada no se muestra');
  }

  if (suma !== linea.length) { fallos++; console.log(`  *** suma ${suma} != total ${linea.length}`); }
  else console.log(`  ${'-'.repeat(50)}\n  suma ${suma} / total ${linea.length}  CUADRA`);

  if (principales.length === 1 && otras.count > 0) { fallos++; console.log('  *** una sola marca principal: umbral sospechoso'); }
}

console.log(`\nAlcanzables: ${alcanzables.size} / ${arr.length}`);
if (alcanzables.size !== arr.length) {
  fallos++;
  for (const s of arr.filter(s => !alcanzables.has(s.id)).slice(0,15))
    console.log(`  INALCANZABLE: ${s.brand} — ${s.name}`);
}
console.log(fallos ? `\n*** ${fallos} FALLO(S) ***` : '\nTODO CORRECTO');
process.exit(fallos ? 1 : 0);
