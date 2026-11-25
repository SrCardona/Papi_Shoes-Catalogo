"""
FOTOS LIVIANAS
═══════════════════════════════════════════════════════════════════════════

Escribe en `public/livianas/` dos copias encogidas de cada foto de
`public/catalogo/`, con la misma ruta:

    public/catalogo/sneakers/nike/hombre/nike-dunk.jpg
      → public/livianas/sneakers/nike/hombre/nike-dunk-384.webp   (tarjeta)
      → public/livianas/sneakers/nike/hombre/nike-dunk-800.webp   (ficha)

POR QUÉ
───────
Las fotos de proveedor pesan 156 KB de promedio para una tarjeta que en el
celular mide 175 px. Antes las encogía el optimizador de Vercel al vuelo, pero
tiene cuota mensual y al agotarse (402) el sitio caía a los archivos enteros.
Hechas una vez aquí, no hay cuota que se acabe: son archivos del sitio.

Los anchos van en `ANCHOS_LIVIANAS` de `src/components/ui/SmartImage.tsx`: si
se cambia uno, se cambia el otro. La calidad (75) es la que usaba el
optimizador. Nunca se agranda una foto: si mide menos, la copia queda de su
tamaño. El original no se toca.

Es incremental: solo rehace lo que falta o lo que es más viejo que su foto, y
borra las copias de fotos que ya no existen. Corre al final de
`npm run catalogo`; a mano: `py scripts/fotos-livianas.py`.
"""

from __future__ import annotations

import os
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

from PIL import Image, ImageOps

RAIZ = Path(__file__).resolve().parent.parent
ORIGEN = RAIZ / "public" / "catalogo"
DESTINO = RAIZ / "public" / "livianas"
ANCHOS = (384, 800)
CALIDAD = 75
EXTENSIONES = {".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"}


def fotos() -> list[Path]:
    """Las fotos que sirve el sitio. Las carpetas que empiezan por `_` (la
    bandeja `_entrada`) no se publican, igual que en `generar-catalogo.mjs`."""
    lista = []
    for carpeta, subcarpetas, archivos in os.walk(ORIGEN):
        subcarpetas[:] = [s for s in subcarpetas if not s.startswith("_")]
        for nombre in archivos:
            if Path(nombre).suffix.lower() in EXTENSIONES:
                lista.append(Path(carpeta) / nombre)
    return sorted(lista)


def copias_de(foto: Path) -> dict[int, Path]:
    relativa = foto.relative_to(ORIGEN).with_suffix("")
    return {a: DESTINO / f"{relativa.as_posix()}-{a}.webp" for a in ANCHOS}


def hacer(foto: Path) -> int:
    pendientes = {
        a: ruta
        for a, ruta in copias_de(foto).items()
        if not ruta.exists() or ruta.stat().st_mtime < foto.stat().st_mtime
    }
    if not pendientes:
        return 0
    with Image.open(foto) as im:
        # La orientación del celular viene en el EXIF; sin esto, una foto
        # vertical saldría acostada.
        im = ImageOps.exif_transpose(im)
        im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
        for ancho, ruta in pendientes.items():
            w = min(ancho, im.width)
            h = round(im.height * w / im.width)
            chica = im.resize((w, h), Image.LANCZOS) if w < im.width else im
            ruta.parent.mkdir(parents=True, exist_ok=True)
            chica.save(ruta, "WEBP", quality=CALIDAD, method=4)
    return len(pendientes)


def main() -> int:
    lista = fotos()
    esperadas = {ruta for f in lista for ruta in copias_de(f).values()}

    with ProcessPoolExecutor() as grupo:
        hechas = sum(grupo.map(hacer, lista, chunksize=16))

    sobrantes = [
        p for p in DESTINO.rglob("*.webp") if p not in esperadas
    ] if DESTINO.exists() else []
    for p in sobrantes:
        p.unlink()
    # Las carpetas que quedaron vacías al borrar sobrantes.
    if DESTINO.exists():
        for carpeta in sorted(DESTINO.rglob("*"), reverse=True):
            if carpeta.is_dir() and not any(carpeta.iterdir()):
                carpeta.rmdir()

    print(
        f"Fotos livianas: {len(lista)} fotos, {hechas} copias nuevas, "
        f"{len(sobrantes)} sobrantes borradas."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
