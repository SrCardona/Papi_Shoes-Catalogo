"""
BORRADO DEL RECUADRO DEL PROVEEDOR
===========================================================================

Las fotos que manda el proveedor traen un codigo en un recuadro blanco
redondeado ("5031-3", "3382H", "J", "K"), casi siempre en una esquina. Este
script lo detecta y lo borra reconstruyendo el fondo que tapaba.

    python scripts/quitar-recuadro.py            # solo reporta, no toca nada
    python scripts/quitar-recuadro.py --aplicar  # borra las que pasan la prueba
    python scripts/quitar-recuadro.py --aplicar --forzar   # borra aunque se note

No se inventan pixeles: se COPIA un trozo real de fondo de la misma foto. Se
prueban varios desplazamientos, se mide cual empalma mejor con el anillo de
pixeles que rodea el recuadro, y se pega el ganador con los bordes difuminados.
Sobre madera de vetas verticales el desplazamiento vertical trae las mismas
rayas con su grano; sobre marmol, pared o alfombra, igual.

El numero de "empalme" es lo que decide: es la diferencia media entre el borde
del hueco y el borde del trozo que va a taparlo. Si es bajo, la costura no se
ve. Si es alto (una hoja, el tenis mismo, el canto de una caja cruzando el
recuadro) la foto se reporta y NO se toca.

Necesita Pillow. No modifica nada sin --aplicar.
"""

import sys
from collections import deque
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
FOTOS = RAIZ / "public" / "catalogo"
EXT = {".jpg", ".jpeg", ".png", ".webp"}

APLICAR = "--aplicar" in sys.argv
FORZAR = "--forzar" in sys.argv
SOLO = next((a for a in sys.argv[1:] if not a.startswith("--")), None)

ANCHO_DET = 260          # ancho al que se reduce para detectar
UMBRAL_BLANCO = 232      # min(r,g,b) por encima de esto = casi blanco
UMBRAL_TEXTO = 140       # max(r,g,b) por debajo de esto = texto oscuro
ERROR_MAX = 11.0         # empalme maximo que todavia se ve limpio (calibrado a ojo)


# ── Deteccion ────────────────────────────────────────────────────────────────

def componentes(mask, w, h):
    """Componentes conexas de la mascara, como (x0, y0, x1, y1, area)."""
    visto = bytearray(w * h)
    for inicio in range(w * h):
        if mask[inicio] == 0 or visto[inicio]:
            continue
        cola = deque([inicio])
        visto[inicio] = 1
        x0 = x1 = inicio % w
        y0 = y1 = inicio // w
        area = 0
        while cola:
            p = cola.popleft()
            area += 1
            px, py = p % w, p // w
            x0, x1 = min(x0, px), max(x1, px)
            y0, y1 = min(y0, py), max(y1, py)
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = px + dx, py + dy
                if 0 <= nx < w and 0 <= ny < h:
                    q = ny * w + nx
                    if mask[q] and not visto[q]:
                        visto[q] = 1
                        cola.append(q)
        yield x0, y0, x1, y1, area


def detectar(img):
    """Caja del recuadro en coordenadas de la imagen original, o None."""
    W, H = img.size
    esc = ANCHO_DET / W
    w, h = ANCHO_DET, max(1, round(H * esc))
    px = img.resize((w, h), Image.BILINEAR).load()

    mask = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y][:3]
            if r >= UMBRAL_BLANCO and g >= UMBRAL_BLANCO and b >= UMBRAL_BLANCO:
                mask[y * w + x] = 1

    mejor = None
    for x0, y0, x1, y1, area in componentes(mask, w, h):
        bw, bh = x1 - x0 + 1, y1 - y0 + 1
        if not (0.04 * w <= bw <= 0.60 * w):
            continue
        if not (0.018 * h <= bh <= 0.085 * h):
            continue
        if not (0.8 <= bw / bh <= 9.0):
            continue
        # Solida: la placa es un bloque, no un reflejo deshilachado.
        if area / (bw * bh) < 0.5:
            continue
        # En el borde de la foto, no en el centro.
        cx, cy = (x0 + x1) / 2 / w, (y0 + y1) / 2 / h
        if not (cy < 0.22 or cy > 0.78 or cx < 0.18 or cx > 0.82):
            continue
        # Texto oscuro adentro: es lo que la separa de un tenis blanco.
        oscuros = total = 0
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                total += 1
                if max(px[x, y][:3]) < UMBRAL_TEXTO:
                    oscuros += 1
        if not (0.02 <= oscuros / total <= 0.55):
            continue
        if mejor is None or area > mejor[4]:
            mejor = (x0, y0, x1, y1, area)

    if mejor is None:
        return None

    x0, y0, x1, y1, _ = mejor
    m = 6  # margen: el halo blanco del recuadro se sale de la caja exacta
    return (
        max(0, int(x0 / esc) - m),
        max(0, int(y0 / esc) - m),
        min(W, int((x1 + 1) / esc) + m),
        min(H, int((y1 + 1) / esc) + m),
    )


# ── Reconstruccion ───────────────────────────────────────────────────────────
#
# Interpolar entre los bordes acierta el color pero borra la textura, y el ojo
# ve el rectangulo liso aunque el error de color sea minimo. Asi que en vez de
# inventar pixeles se COPIA un trozo real de fondo de la misma foto: se buscan
# candidatos desplazados, se elige el que mejor empalma en el borde y se pega
# con los bordes difuminados. Sobre madera de vetas verticales un desplazamiento
# vertical trae las mismas rayas con su grano; sobre marmol o pared, lo mismo.

BORDE = 5      # ancho del anillo con el que se mide el empalme
PLUMA = 6      # pixeles de degradado al pegar, para que no quede costura


def _anillo(px, caja, W, H):
    """Pixeles del anillo exterior de la caja, en orden estable."""
    x0, y0, x1, y1 = caja
    out = []
    for d in range(1, BORDE + 1):
        for x in range(x0, x1):
            out.append(px[x, y0 - d] if y0 - d >= 0 else None)
            out.append(px[x, y1 + d - 1] if y1 + d - 1 < H else None)
        for y in range(y0, y1):
            out.append(px[x0 - d, y] if x0 - d >= 0 else None)
            out.append(px[x1 + d - 1, y] if x1 + d - 1 < W else None)
    return out


def _costo(a, b):
    """Diferencia media entre dos anillos. None si no son comparables."""
    suma = n = 0
    for p, q in zip(a, b):
        if p is None or q is None:
            continue
        suma += abs(p[0] - q[0]) + abs(p[1] - q[1]) + abs(p[2] - q[2])
        n += 3
    return suma / n if n else None


def buscar_fuente(img, caja):
    """Mejor trozo de fondo que empalma con el hueco. Devuelve (caja, costo)."""
    W, H = img.size
    x0, y0, x1, y1 = caja
    bw, bh = x1 - x0, y1 - y0
    px = img.load()
    destino = _anillo(px, caja, W, H)

    mejor = (None, None)
    pasos = []
    for k in range(1, 7):
        pasos += [(0, k * bh), (0, -k * bh), (k * bw, 0), (-k * bw, 0)]
    for k in range(1, 4):
        pasos += [(k * bw, k * bh), (-k * bw, k * bh),
                  (k * bw, -k * bh), (-k * bw, -k * bh)]

    for dx, dy in pasos:
        c = (x0 + dx, y0 + dy, x1 + dx, y1 + dy)
        if c[0] - BORDE < 0 or c[1] - BORDE < 0:
            continue
        if c[2] + BORDE >= W or c[3] + BORDE >= H:
            continue
        # La fuente no puede tocar el recuadro que estamos borrando.
        if not (c[2] <= x0 or c[0] >= x1 or c[3] <= y0 or c[1] >= y1):
            continue
        costo = _costo(destino, _anillo(px, c, W, H))
        if costo is None:
            continue
        if mejor[1] is None or costo < mejor[1]:
            mejor = (c, costo)
    return mejor


def parchar(img, caja, fuente):
    """
    Pega la fuente sobre la caja.

    La mascara vale 255 en TODA la caja y solo se degrada hacia afuera, sobre
    fondo limpio. Si el degradado cayera dentro de la caja, el borde blanco del
    recuadro sobreviviria a medias y quedaria un fantasma con su forma.
    """
    W, H = img.size
    x0, y0, x1, y1 = caja
    bw, bh = x1 - x0, y1 - y0

    ex0, ey0 = max(0, x0 - PLUMA), max(0, y0 - PLUMA)
    ex1, ey1 = min(W, x1 + PLUMA), min(H, y1 + PLUMA)
    ew, eh = ex1 - ex0, ey1 - ey0

    fx, fy = fuente[0] - (x0 - ex0), fuente[1] - (y0 - ey0)
    if fx < 0 or fy < 0 or fx + ew > W or fy + eh > H:
        return img

    trozo = img.crop((fx, fy, fx + ew, fy + eh))

    ix0, iy0 = x0 - ex0, y0 - ey0
    ix1, iy1 = ix0 + bw, iy0 + bh
    mask = Image.new("L", (ew, eh), 0)
    mp = mask.load()
    for y in range(eh):
        dy = 0 if iy0 <= y < iy1 else (iy0 - y if y < iy0 else y - iy1 + 1)
        for x in range(ew):
            dx = 0 if ix0 <= x < ix1 else (ix0 - x if x < ix0 else x - ix1 + 1)
            d = max(dx, dy)
            mp[x, y] = 255 if d == 0 else max(0, round(255 * (1 - d / (PLUMA + 1))))

    img.paste(trozo, (ex0, ey0), mask)
    return img


def evaluar(img, caja):
    """Devuelve (caja_fuente, costo_de_empalme)."""
    return buscar_fuente(img, caja)


# ── Recorrido ────────────────────────────────────────────────────────────────

def fotos():
    for p in sorted(FOTOS.rglob("*")):
        if p.is_file() and p.suffix.lower() in EXT and "_entrada" not in p.parts:
            yield p


def main():
    objetivo = [Path(SOLO).resolve()] if SOLO else list(fotos())
    limpias, dudosas, sin_placa = [], [], 0

    for p in objetivo:
        try:
            with Image.open(p) as im:
                img = im.convert("RGB")
                caja = detectar(img)
                if caja is None:
                    sin_placa += 1
                    continue
                fuente, costo = evaluar(img, caja)
                rel = p.relative_to(RAIZ).as_posix() if p.is_relative_to(RAIZ) else p.name
                if fuente is None:
                    dudosas.append((rel, caja, None))
                    continue
                fila = (rel, caja, costo)
                if costo <= ERROR_MAX:
                    limpias.append(fila)
                else:
                    dudosas.append(fila)
                if APLICAR and (costo <= ERROR_MAX or FORZAR):
                    parchar(img, caja, fuente).save(p, quality=95, subsampling=0)
        except Exception as e:  # noqa: BLE001
            print(f"  ERROR {p.name}: {e}")

    print(f"\nRevisadas: {len(objetivo)}   sin recuadro: {sin_placa}")
    print(f"\nSE PUEDE BORRAR SIN QUE SE NOTE ({len(limpias)})")
    for rel, caja, costo in limpias:
        print(f"   {rel}\n      empalme {costo:.1f}  caja {caja}")
    print(f"\nSE NOTARIA, NO SE TOCA ({len(dudosas)})")
    for rel, caja, costo in dudosas:
        c = f"{costo:.1f}" if costo is not None else "sin fuente"
        print(f"   {rel}\n      empalme {c}  caja {caja}")
    if APLICAR:
        n = len(limpias) + (len(dudosas) if FORZAR else 0)
        print(f"\nAPLICADO en {n} foto(s).")
    else:
        print("\nEn seco: no se modifico ningun archivo. Usa --aplicar para borrar.")


if __name__ == "__main__":
    main()
