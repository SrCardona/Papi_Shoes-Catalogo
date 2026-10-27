"""
RECORTE Y LIMPIEZA DE LAS FOTOS NUEVAS (paso 4 de "Procesar fotos nuevas")
===========================================================================

Solo trabaja sobre public/catalogo/_entrada/: las fotos ya publicadas no se
tocan nunca desde aqui.

    tools/.venv/Scripts/python scripts/recortar-entrada.py            # en seco + hoja
    tools/.venv/Scripts/python scripts/recortar-entrada.py foto.jpg   # solo esas
    tools/.venv/Scripts/python scripts/recortar-entrada.py --aplicar  # respalda y escribe

Necesita el venv de tools/.venv (rembg + onnxruntime + Pillow, ver CLAUDE.md).

Que hace con cada foto:

1. BiRefNet (birefnet-general) detecta donde esta el tenis. Solo detecta: la
   mascara sirve para ubicar el recorte y nunca se aplica a la foto, que
   conserva su fondo.
2. Recorte cuadrado centrado en el tenis, con 8 % de margen por lado. Si el
   cuadrado no cabe en la foto (muy apaisada) o la deteccion no es clara, no se
   recorta: el sitio rellena la celda solo y un tenis cortado no tiene arreglo.
   Nunca se escala: agrandar inventa detalle.
3. Codigo de inventario: se busca con el mismo detector de
   scripts/quitar-recuadro.py. Fuera del recorte, el recorte lo elimina; dentro
   y lejos del tenis, se borra copiando fondo real con la misma tecnica; encima
   del tenis o donde no empalma limpio, se deja y se reporta.

Sin --aplicar no modifica nada: escribe la hoja de revision en
lotes/revision/<fecha>/, al 100 %, con el antes y el despues de cada foto. Con
--aplicar copia antes los originales a lotes/originales/<fecha>/ (fuera de
public/ y sin versionar) y despues escribe el resultado encima de la foto de
_entrada/.

Limite conocido: el detector de codigos encuentra recuadros blancos con texto
oscuro. Un numero suelto pintado sin recuadro no lo ve; ese se juzga en la hoja.
"""

import importlib.util
import shutil
import sys
from datetime import date
from pathlib import Path

from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
ENTRADA = RAIZ / "public" / "catalogo" / "_entrada"
HOY = date.today().isoformat()
RESPALDO = RAIZ / "lotes" / "originales" / HOY
REVISION = RAIZ / "lotes" / "revision" / HOY
EXT = {".jpg", ".jpeg", ".jfif", ".png", ".webp"}

APLICAR = "--aplicar" in sys.argv
ELEGIDAS = [a for a in sys.argv[1:] if not a.startswith("--")]

MARGEN = 0.08            # por lado, como fraccion del lado del cuadrado
ANCHO_MASCARA = 320      # la mascara se analiza reducida: basta para la caja
UMBRAL_MASCARA = 128
# Deteccion clara: el tenis ocupa una parte razonable de la foto y la mascara
# es firme. Si la mitad del contorno queda en grises, BiRefNet duda.
AREA_MIN, AREA_MAX = 0.02, 0.85
DUDA_MAX = 0.35
TENIS_EN_CODIGO = 0.01   # fraccion de la caja del codigo que puede ser tenis


def _cargar_recuadro():
    """quitar-recuadro.py lleva guion y no se importa por nombre."""
    # Sin .pyc: el de quitar-recuadro esta versionado y no debe cambiar.
    sys.dont_write_bytecode = True
    ruta = RAIZ / "scripts" / "quitar-recuadro.py"
    spec = importlib.util.spec_from_file_location("quitar_recuadro", ruta)
    mod = importlib.util.module_from_spec(spec)
    sys.argv, argv = sys.argv[:1], sys.argv  # que no lea nuestras banderas
    spec.loader.exec_module(mod)
    sys.argv = argv
    return mod


recuadro = _cargar_recuadro()


# ── Deteccion del tenis ──────────────────────────────────────────────────────

_sesion = None


def mascara(img):
    global _sesion
    from rembg import new_session, remove

    if _sesion is None:
        _sesion = new_session("birefnet-general")
    return remove(img, session=_sesion, only_mask=True).convert("L")


def caja_tenis(mask):
    """
    Caja del tenis en coordenadas de la foto, o (None, motivo).

    Se queda con la componente mas grande y con las que miden al menos un
    quinto de ella: un tenis con la suela separada por una sombra sale en dos
    trozos, pero una mota suelta del fondo no debe estirar el recorte.
    """
    W, H = mask.size
    esc = ANCHO_MASCARA / W
    w, h = ANCHO_MASCARA, max(1, round(H * esc))
    px = mask.resize((w, h), Image.BILINEAR).load()

    binaria = bytearray(w * h)
    firmes = dudosos = 0
    for y in range(h):
        for x in range(w):
            v = px[x, y]
            if v >= UMBRAL_MASCARA:
                binaria[y * w + x] = 1
            if v >= 215:
                firmes += 1
            elif v >= 40:
                dudosos += 1

    comps = sorted(recuadro.componentes(binaria, w, h), key=lambda c: -c[4])
    if not comps:
        return None, "no se detecto ningun tenis"
    mayor = comps[0][4]
    piezas = [c for c in comps if c[4] >= mayor / 5]
    area = sum(c[4] for c in piezas) / (w * h)
    if not AREA_MIN <= area <= AREA_MAX:
        return None, f"deteccion no clara (ocupa {area:.0%} de la foto)"
    if dudosos / max(1, firmes + dudosos) > DUDA_MAX:
        return None, "deteccion no clara (mascara difusa)"

    x0 = min(c[0] for c in piezas)
    y0 = min(c[1] for c in piezas)
    x1 = max(c[2] for c in piezas) + 1
    y1 = max(c[3] for c in piezas) + 1
    # En las fotos "en mano" BiRefNet toma como primer plano las manos, los
    # brazos y el par puesto, todo pegado al tenis. Esa caja llega a los
    # bordes y recortar con ella no centra nada: mejor decirlo que adivinar.
    bordes = (x0 <= 1) + (y0 <= 1) + (x1 >= w - 1) + (y1 >= h - 1)
    if bordes >= 2:
        return None, "la deteccion incluye mas que el tenis (manos, piernas u otro par)"
    # Un pixel de la mascara reducida cubre varios de la foto: se redondea
    # hacia afuera para no comerse la punta ni el talon.
    return (
        max(0, int(x0 / esc) - 2),
        max(0, int(y0 / esc) - 2),
        min(W, int(x1 / esc) + 2),
        min(H, int(y1 / esc) + 2),
    ), None


def cuadrado(caja, W, H):
    """Cuadrado de recorte con el margen pedido, o (None, motivo)."""
    x0, y0, x1, y1 = caja
    lado = round(max(x1 - x0, y1 - y0) / (1 - 2 * MARGEN))
    if lado > min(W, H):
        return None, "no cabe en un cuadrado sin cortar el tenis"
    if lado >= min(W, H) - 2 and W == H:
        return None, "ya es cuadrada y el tenis la llena"
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    # Centrado en el tenis y empujado hacia adentro si se sale de la foto.
    qx = min(max(0, round(cx - lado / 2)), W - lado)
    qy = min(max(0, round(cy - lado / 2)), H - lado)
    q = (qx, qy, qx + lado, qy + lado)
    if not (q[0] <= x0 and q[1] <= y0 and q[2] >= x1 and q[3] >= y1):
        return None, "el recorte cortaria el tenis"
    return q, None


# ── Codigo de inventario ─────────────────────────────────────────────────────

def _se_tocan(a, b):
    return not (a[2] <= b[0] or a[0] >= b[2] or a[3] <= b[1] or a[1] >= b[3])


def resolver_codigo(img, mask, cod, recorte):
    """Devuelve (img, estado) despues de decidir que hacer con el codigo."""
    if recorte is not None and not _se_tocan(cod, recorte):
        return img, "fuera del recorte: lo elimina el recorte"
    # Dentro o a medias: se borra entero antes de recortar, porque el borde
    # del cuadrado dejaria medio recuadro a la vista.
    zona = mask.crop(cod)
    tenis = sum(zona.histogram()[UMBRAL_MASCARA:])
    if tenis / max(1, zona.width * zona.height) > TENIS_EN_CODIGO:
        return img, "AVISO: encima del tenis, no se borra"

    fuente, costo = recuadro.evaluar(img, cod)
    if fuente is None:
        return img, "AVISO: no hay fondo para copiar, no se borra"
    if costo > recuadro.ERROR_MAX:
        return img, f"AVISO: zona con detalle (empalme {costo:.1f}), no se borra"
    return recuadro.parchar(img, cod, fuente), f"borrado (empalme {costo:.1f})"


# ── Proceso ──────────────────────────────────────────────────────────────────

def procesar(ruta):
    with Image.open(ruta) as im:
        original = im.convert("RGB")
    W, H = original.size
    mask = mascara(original)

    caja, motivo = caja_tenis(mask)
    recorte = None
    if caja is not None:
        recorte, motivo = cuadrado(caja, W, H)

    img = original.copy()
    cod = recuadro.detectar(original)
    estado_cod = "sin codigo detectado"
    if cod is not None:
        img, estado_cod = resolver_codigo(img, mask, cod, recorte)

    final = img.crop(recorte) if recorte is not None else img
    return {
        "ruta": ruta,
        "original": original,
        "final": final,
        "tenis": caja,
        "recorte": recorte,
        "estado_recorte": (f"recortada a {recorte[2] - recorte[0]} px"
                           if recorte else f"sin recortar: {motivo}"),
        "codigo": cod,
        "estado_codigo": estado_cod,
        "pequena": W < 600,
    }


def hoja(r):
    """
    Antes y despues al 100 %, uno al lado del otro.

    En el antes se marca el tenis detectado (blanco), el recorte (azul) y el
    codigo (rojo). Sin escalar: a tamano reducido un parche malo pasa por bueno.
    """
    antes = r["original"].copy()
    d = ImageDraw.Draw(antes)
    if r["tenis"]:
        d.rectangle(r["tenis"], outline=(255, 255, 255), width=2)
    if r["recorte"]:
        d.rectangle(r["recorte"], outline=(115, 142, 222), width=4)
    if r["codigo"]:
        d.rectangle(r["codigo"], outline=(230, 40, 40), width=4)
    despues = r["final"]

    cab = 54
    lienzo = Image.new("RGB", (antes.width + despues.width + 16,
                               max(antes.height, despues.height) + cab),
                       (20, 20, 20))
    dr = ImageDraw.Draw(lienzo)
    dr.text((8, 6), r["ruta"].name, fill=(255, 220, 120))
    dr.text((8, 22), f"recorte: {r['estado_recorte']}", fill=(230, 230, 230))
    dr.text((8, 38), f"codigo: {r['estado_codigo']}", fill=(230, 230, 230))
    lienzo.paste(antes, (0, cab))
    lienzo.paste(despues, (antes.width + 16, cab))
    REVISION.mkdir(parents=True, exist_ok=True)
    destino = REVISION / f"{r['ruta'].stem}.png"
    lienzo.save(destino)
    return destino


def respaldar(ruta):
    """Copia el original sin pisar uno que ya este respaldado con ese nombre."""
    RESPALDO.mkdir(parents=True, exist_ok=True)
    destino = RESPALDO / ruta.name
    n = 2
    while destino.exists():
        if destino.read_bytes() == ruta.read_bytes():
            return destino
        destino = RESPALDO / f"{ruta.stem}_{n}{ruta.suffix}"
        n += 1
    shutil.copy2(ruta, destino)
    return destino


def main():
    if ELEGIDAS:
        rutas = [Path(a).resolve() for a in ELEGIDAS]
        fuera = [r for r in rutas if ENTRADA not in r.parents]
        if fuera:
            sys.exit(f"Solo se procesan fotos de _entrada/: {fuera[0]}")
    else:
        rutas = sorted(p for p in ENTRADA.iterdir()
                       if p.is_file() and p.suffix.lower() in EXT)
    if not rutas:
        print("No hay fotos en _entrada/.")
        return

    for ruta in rutas:
        r = procesar(ruta)
        print(f"\n{ruta.name}")
        print(f"   recorte: {r['estado_recorte']}")
        print(f"   codigo:  {r['estado_codigo']}")
        if r["pequena"]:
            print(f"   AVISO: mide {r['original'].width} px de ancho (< 600)")
        print(f"   hoja:    {hoja(r).relative_to(RAIZ).as_posix()}")
        cambio = r["recorte"] is not None or r["estado_codigo"].startswith("borrado")
        if APLICAR and cambio:
            print(f"   respaldo: {respaldar(ruta).relative_to(RAIZ).as_posix()}")
            r["final"].save(ruta, quality=95, subsampling=0)

    if not APLICAR:
        print("\nEn seco: no se modifico ninguna foto. Usa --aplicar tras aprobar la hoja.")


if __name__ == "__main__":
    main()
