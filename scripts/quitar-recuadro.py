"""
BORRADO DEL RECUADRO DEL PROVEEDOR
===========================================================================

Las fotos que manda el proveedor traen un codigo en un recuadro blanco
redondeado ("5031-3", "3382H", "J", "K"), casi siempre en una esquina. Este
script lo detecta y lo borra reconstruyendo el fondo que tapaba.

    python scripts/quitar-recuadro.py            # solo reporta, no toca nada
    python scripts/quitar-recuadro.py --hoja     # hojas 1:1 antes/despues para revisar
    python scripts/quitar-recuadro.py --aplicar  # borra las que pasan la prueba
    python scripts/quitar-recuadro.py --aplicar --forzar   # borra aunque se note

No se inventan pixeles: se COPIA un trozo real de fondo de la misma foto. Se
prueban varios desplazamientos, se mide cual empalma mejor con el anillo de
pixeles que rodea el recuadro, y se pega el ganador con los bordes difuminados.
Sobre madera de vetas verticales el desplazamiento vertical trae las mismas
rayas con su grano; sobre marmol, pared o alfombra, igual.

El numero de "empalme" ordena los candidatos: es la diferencia media entre el
borde del hueco y el borde del trozo que va a taparlo. Por debajo de ERROR_MAX
el parche aguanta; por encima (una hoja, el tenis mismo, el canto de una caja
cruzando el recuadro) la foto se reporta y NO se toca.

REVISA CON --hoja ANTES DE APLICAR ALGO DUDOSO. El empalme ordena bien pero no
decide: hay parches de 12 que fallan porque el recuadro cae sobre el tenis, y
otros de 20 que quedan perfectos. Y sobre todo, revisa las hojas al 100%: en
miniatura un parche malo se ve bien, y asi se cuelan manchas al catalogo.

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
HOJA = "--hoja" in sys.argv
FORZAR = "--forzar" in sys.argv
SOLO = next((a for a in sys.argv[1:] if not a.startswith("--")), None)

ANCHO_DET = 260          # ancho al que se reduce para detectar
UMBRAL_BLANCO = 232      # min(r,g,b) por encima de esto = casi blanco
UMBRAL_TEXTO = 140       # max(r,g,b) por debajo de esto = texto oscuro
ERROR_MAX = 9.5          # solo lo que es seguro sin mirar; por encima, usa --hoja


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


def _anillo(px, caja, W, H, paso=1):
    """Pixeles del anillo exterior de la caja, en orden estable."""
    x0, y0, x1, y1 = caja
    out = []
    for d in range(1, BORDE + 1):
        for x in range(x0, x1, paso):
            out.append(px[x, y0 - d] if y0 - d >= 0 else None)
            out.append(px[x, y1 + d - 1] if y1 + d - 1 < H else None)
        for y in range(y0, y1, paso):
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
    """
    Mejor trozo de fondo que empalma con el hueco. Devuelve (caja, costo).

    Busqueda densa en dos pasadas: primero se barre una ventana amplia con el
    anillo submuestreado, que es barato, y despues se recalcula el costo exacto
    solo sobre los mejores candidatos. Probar unas pocas posiciones en cruz
    dejaba fuera el trozo bueno y condenaba fotos que si tenian arreglo.
    """
    W, H = img.size
    x0, y0, x1, y1 = caja
    bw, bh = x1 - x0, y1 - y0
    px = img.load()

    paso = max(2, min(bw, bh) // 8)
    destino_grueso = _anillo(px, caja, W, H, paso)

    dx_paso = max(4, bw // 6)
    dy_paso = max(4, bh // 6)
    candidatos = []
    for dy in range(-4 * bh, 4 * bh + 1, dy_paso):
        for dx in range(-3 * bw, 3 * bw + 1, dx_paso):
            if dx == 0 and dy == 0:
                continue
            c = (x0 + dx, y0 + dy, x1 + dx, y1 + dy)
            if c[0] - BORDE < 0 or c[1] - BORDE < 0:
                continue
            if c[2] + BORDE >= W or c[3] + BORDE >= H:
                continue
            # La fuente no puede tocar el recuadro ni su halo.
            if not (c[2] <= x0 - 2 or c[0] >= x1 + 2 or c[3] <= y0 - 2 or c[1] >= y1 + 2):
                continue
            costo = _costo(destino_grueso, _anillo(px, c, W, H, paso))
            if costo is not None:
                candidatos.append((costo, c))

    if not candidatos:
        return (None, None)

    candidatos.sort(key=lambda t: t[0])
    destino_fino = _anillo(px, caja, W, H, 1)
    mejor = (None, None)
    for _, c in candidatos[:14]:
        exacto = _costo(destino_fino, _anillo(px, c, W, H, 1))
        if exacto is None:
            continue
        if mejor[1] is None or exacto < mejor[1]:
            mejor = (c, exacto)
    return mejor


def _borde_dif(px, caja, fuente, W, H):
    """
    Diferencia de color entre el borde del hueco y el borde del trozo fuente.

    El trozo casi nunca tiene el brillo exacto del sitio donde va, y esa
    diferencia constante es lo que se ve como banda. Midiendola en los cuatro
    lados se puede corregir el trozo entero para que empalme exacto.
    """
    x0, y0, x1, y1 = caja
    fx, fy = fuente[0], fuente[1]
    bw, bh = x1 - x0, y1 - y0

    def dif(ax, ay, bx, by):
        if not (0 <= ax < W and 0 <= ay < H and 0 <= bx < W and 0 <= by < H):
            return None
        a, b = px[ax, ay][:3], px[bx, by][:3]
        return (a[0] - b[0], a[1] - b[1], a[2] - b[2])

    arr = [dif(x0 + i, y0 - 1, fx + i, fy - 1) for i in range(bw)]
    aba = [dif(x0 + i, y1, fx + i, fy + bh) for i in range(bw)]
    izq = [dif(x0 - 1, y0 + j, fx - 1, fy + j) for j in range(bh)]
    der = [dif(x1, y0 + j, fx + bw, fy + j) for j in range(bh)]
    return arr, aba, izq, der


def parchar(img, caja, fuente):
    """
    Pega el trozo fuente sobre la caja igualando el borde.

    Dos cosas que hubo que aprender: la mascara vale 255 en TODA la caja y solo
    se degrada hacia afuera (si el degradado cayera dentro, el borde blanco del
    recuadro sobreviviria a medias y dejaria un fantasma con su forma); y el
    trozo se corrige con la diferencia medida en los bordes antes de pegarlo,
    que es lo que hace desaparecer la banda sin tocarle la textura.
    """
    W, H = img.size
    x0, y0, x1, y1 = caja
    bw, bh = x1 - x0, y1 - y0
    fx, fy = fuente[0], fuente[1]
    if fx < 1 or fy < 1 or fx + bw >= W or fy + bh >= H:
        return img

    px = img.load()
    arr, aba, izq, der = _borde_dif(px, caja, fuente, W, H)

    src = img.crop((fx, fy, fx + bw, fy + bh))
    sp = src.load()
    out = Image.new("RGB", (bw, bh))
    op = out.load()

    for j in range(bh):
        ty = (j + 1) / (bh + 1)
        for i in range(bw):
            tx = (i + 1) / (bw + 1)
            s = sp[i, j]
            val = []
            for c in range(3):
                partes = []
                if arr[i] is not None and aba[i] is not None:
                    partes.append(arr[i][c] * (1 - ty) + aba[i][c] * ty)
                elif arr[i] is not None:
                    partes.append(arr[i][c])
                elif aba[i] is not None:
                    partes.append(aba[i][c])
                if izq[j] is not None and der[j] is not None:
                    partes.append(izq[j][c] * (1 - tx) + der[j][c] * tx)
                elif izq[j] is not None:
                    partes.append(izq[j][c])
                elif der[j] is not None:
                    partes.append(der[j][c])
                d = sum(partes) / len(partes) if partes else 0
                val.append(max(0, min(255, round(s[c] + d))))
            op[i, j] = tuple(val)

    ex0, ey0 = max(0, x0 - PLUMA), max(0, y0 - PLUMA)
    ex1, ey1 = min(W, x1 + PLUMA), min(H, y1 + PLUMA)
    ew, eh = ex1 - ex0, ey1 - ey0
    lienzo = img.crop((ex0, ey0, ex1, ey1))
    lienzo.paste(out, (x0 - ex0, y0 - ey0))

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

    img.paste(lienzo, (ex0, ey0), mask)
    return img


def evaluar(img, caja):
    """Devuelve (caja_fuente, costo_de_empalme)."""
    return buscar_fuente(img, caja)


# ── Recorrido ────────────────────────────────────────────────────────────────

def fotos():
    for p in sorted(FOTOS.rglob("*")):
        if p.is_file() and p.suffix.lower() in EXT and "_entrada" not in p.parts:
            yield p


def _hojas(casos, por_hoja=13, margen=50):
    """
    Hojas 1:1 con el antes encima del despues, para revisar con los ojos.

    Al 100% y no en miniatura: a tamano reducido un parche malo pasa por bueno,
    y una mancha en el catalogo es peor que el codigo del proveedor.
    """
    from PIL import ImageDraw

    for h in range((len(casos) + por_hoja - 1) // por_hoja):
        grupo = casos[h * por_hoja:(h + 1) * por_hoja]
        recortes = []
        for costo, ruta, caja in grupo:
            with Image.open(ruta) as im:
                img = im.convert("RGB")
            fuente, _ = evaluar(img, caja)
            if fuente is None:
                continue
            x0, y0, x1, y1 = caja
            W, H = img.size
            z = (max(0, x0 - margen), max(0, y0 - margen),
                 min(W, x1 + margen), min(H, y1 + margen))
            recortes.append((f"{costo:.1f}  {ruta.name}", img.crop(z),
                             parchar(img.copy(), caja, fuente).crop(z)))
        if not recortes:
            continue
        ancho = max(max(a.width, b.width) for _, a, b in recortes)
        alto = sum(max(a.height, b.height) + 24 for _, a, b in recortes)
        hoja = Image.new("RGB", (ancho * 2 + 12, alto), (20, 20, 20))
        dr = ImageDraw.Draw(hoja)
        y = 0
        for nom, a, b in recortes:
            dr.text((6, y + 4), nom, fill=(255, 220, 120))
            hoja.paste(a, (0, y + 18))
            hoja.paste(b, (ancho + 12, y + 18))
            y += max(a.height, b.height) + 24
        destino = RAIZ / f"recuadro-hoja-{h}.png"
        hoja.save(destino)
        print(f"  hoja: {destino.name}  ({len(recortes)} casos)")


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

    if HOJA:
        revisables = [(c, RAIZ / r, cj) for r, cj, c in limpias + dudosas if c is not None]
        revisables.sort(key=lambda t: t[0])
        _hojas(revisables)

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
