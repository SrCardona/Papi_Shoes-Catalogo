"""
FONDO DE CADA FOTO PARA SU CELDA CUADRADA
===========================================================================

La tarjeta muestra la foto entera (object-contain) en una celda cuadrada, y
las fotos de proveedor casi nunca son cuadradas: quedan franjas arriba y abajo
(o a los lados). Si la foto tiene fondo liso, pintamos la celda del mismo color
que sus bordes y la foto se funde con ella; el tenis queda centrado y completo.

    py scripts/fondos-fotos.py        # lo corre solo `npm run catalogo`

Por cada foto se miran los dos bordes que dan contra las franjas (arriba y
abajo si es apaisada, izquierda y derecha si es vertical). Un borde es "liso"
cuando la mayor parte cae cerca de su mediana y lo que no, va seguido: el
proveedor recorta muy justo y la suela o la puntera tocan el borde, pero eso
es uno o dos tramos. Una escena (piso, pared, ropa) cambia a cada paso. Si los dos lo son, la
celda se pinta con esos colores: uno solo si se parecen, o mitad y mitad con
corte seco si no (la foto tapa el corte, que cae justo en el centro). Si algun
borde no es liso —una escena, una caja cortada, el recuadro del proveedor— la
foto no entra a la lista y la tarjeta usa su fondo oscuro de siempre.

No toca ninguna foto. Escribe src/data/fondosFotos.ts (generado, no editar).

Necesita Pillow.
"""

from __future__ import annotations

import os
import statistics
import sys
from pathlib import Path
from urllib.parse import quote

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
FOTOS = RAIZ / "public" / "catalogo"
SALIDA = RAIZ / "src" / "data" / "fondosFotos.ts"

EXTENSIONES = {".jpg", ".jpeg", ".png", ".webp", ".jfif"}

# Ancho de trabajo: los bordes se leen igual de bien a 300 px y es 20 veces
# mas rapido que sobre el original.
ANCHO_TRABAJO = 300
# Filas (o columnas) de borde que se leen. Se salta la primera: el JPEG a
# veces deja ahi una linea de otro tono que no se ve pero desempata mal.
DESDE, HASTA = 1, 5
# Cuanto puede alejarse un pixel de la mediana (por canal, 0-255) y seguir
# contando como fondo. El ruido del JPEG sobre blanco ronda 4-6.
TOLERANCIA = 12
# Que fraccion del borde tiene que ser fondo, y en cuantos tramos seguidos
# puede repartirse lo que no lo es (el tenis tocando el borde, el recuadro del
# proveedor en una esquina). Con mas tramos ya es una escena.
MINIMO_LISO = 0.5
MAXIMO_TRAMOS = 3
# Dos bordes cuyos colores difieren menos que esto se pintan de un solo color.
MISMO_COLOR = 6
# Una foto casi cuadrada no deja franjas visibles: no hace falta fondo.
CASI_CUADRADA = 0.02


def ruta_publica(archivo: Path) -> str:
    """La misma ruta que escribe generar-catalogo.mjs (encodeURI)."""
    rel = archivo.relative_to(FOTOS.parent).as_posix()
    return quote(f"/{rel}", safe=";,/?:@&=+$-_.!~*'()#")


def recorrer(carpeta: Path):
    for entrada in sorted(carpeta.iterdir()):
        if entrada.is_dir():
            # Igual que walk() del generador: lo que empieza por _ no se publica.
            if entrada.name.startswith("_"):
                continue
            yield from recorrer(entrada)
        elif entrada.suffix.lower() in EXTENSIONES:
            yield entrada


def color_de_borde(
    franja: list[list[tuple[int, int, int]]],
) -> tuple[int, int, int] | None:
    """`franja`: una lista por posicion a lo largo del borde, con los pixeles
    de esa posicion en las filas (o columnas) que se leen."""
    pixeles = [p for posicion in franja for p in posicion]
    mediana = tuple(int(statistics.median(p[c] for p in pixeles)) for c in range(3))

    def es_fondo(p: tuple[int, int, int]) -> bool:
        return max(abs(p[c] - mediana[c]) for c in range(3)) <= TOLERANCIA

    perfil = [all(es_fondo(p) for p in posicion) for posicion in franja]
    if sum(perfil) / len(perfil) < MINIMO_LISO:
        return None
    tramos = sum(
        1 for i, fondo in enumerate(perfil) if not fondo and (i == 0 or perfil[i - 1])
    )
    return mediana if tramos <= MAXIMO_TRAMOS else None


def hex_de(color: tuple[int, int, int]) -> str:
    return "#" + "".join(f"{c:02x}" for c in color)


def fondo_de(archivo: Path) -> str | None:
    with Image.open(archivo) as original:
        imagen = original.convert("RGB")
    ancho, alto = imagen.size
    proporcion = ancho / alto
    if abs(proporcion - 1) < CASI_CUADRADA:
        return None
    imagen = imagen.resize(
        (ANCHO_TRABAJO, max(1, round(ANCHO_TRABAJO / proporcion))), Image.Resampling.BOX
    )
    ancho, alto = imagen.size
    datos = imagen.load()

    if proporcion > 1:
        # Apaisada: franjas arriba y abajo.
        bordes = [
            [[datos[x, y] for y in range(DESDE, HASTA)] for x in range(ancho)],
            [[datos[x, alto - 1 - y] for y in range(DESDE, HASTA)] for x in range(ancho)],
        ]
        direccion = "to bottom"
    else:
        bordes = [
            [[datos[x, y] for x in range(DESDE, HASTA)] for y in range(alto)],
            [[datos[ancho - 1 - x, y] for x in range(DESDE, HASTA)] for y in range(alto)],
        ]
        direccion = "to right"

    a, b = (color_de_borde(borde) for borde in bordes)
    if a is None or b is None:
        return None
    if max(abs(a[c] - b[c]) for c in range(3)) <= MISMO_COLOR:
        promedio = tuple((a[c] + b[c]) // 2 for c in range(3))
        return hex_de(promedio)
    return f"linear-gradient({direccion},{hex_de(a)} 50%,{hex_de(b)} 50%)"


def main() -> int:
    fondos: dict[str, str] = {}
    cuadradas = escenas = 0
    for archivo in recorrer(FOTOS):
        try:
            fondo = fondo_de(archivo)
        except OSError as error:
            print(f"  no se pudo leer {archivo.relative_to(RAIZ)}: {error}", file=sys.stderr)
            continue
        if fondo:
            fondos[ruta_publica(archivo)] = fondo
        else:
            with Image.open(archivo) as im:
                w, h = im.size
            if abs(w / h - 1) < CASI_CUADRADA:
                cuadradas += 1
            else:
                escenas += 1

    lineas = "\n".join(f"  {quote_ts(k)}: {quote_ts(v)}," for k, v in sorted(fondos.items()))
    SALIDA.write_text(
        f"""/**
 * ARCHIVO GENERADO — no lo edites a mano.
 *
 * Lo escribe scripts/fondos-fotos.py (corre dentro de `npm run catalogo`).
 * El fondo de la celda cuadrada de cada foto con borde liso, para que la foto
 * se funda con la celda. Una foto que no esta aqui usa el fondo oscuro.
 */
export const FONDOS_FOTOS: Record<string, string> = {{
{lineas}
}};
""",
        encoding="utf-8",
        newline="\n",
    )
    print(
        f"Fondos: {len(fondos)} fotos con borde liso, {escenas} con escena "
        f"(fondo oscuro), {cuadradas} cuadradas (sin franjas)."
    )
    return 0


def quote_ts(texto: str) -> str:
    return "'" + texto.replace("\\", "\\\\").replace("'", "\\'") + "'"


if __name__ == "__main__":
    os.chdir(RAIZ)
    sys.exit(main())
