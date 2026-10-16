"""
TENIS SIN FONDO PARA LAS VITRINAS
===========================================================================

Saca de la portada de cada par UN tenis de perfil, sin fondo, para que en la
portada y el catalogo todos floten igual sobre el negro de la casa.

    python scripts/recortar-fondos.py --muestra 20 --hoja   # prueba, no toca el sitio
    python scripts/recortar-fondos.py --solo ruta.jpg ...    # unas fotos concretas
    python scripts/recortar-fondos.py --aplicar              # escribe public/recortes/

Sin --aplicar escribe en una carpeta de prueba (--salida) y no toca ni
public/ ni src/. Con --aplicar deja cada recorte en public/recortes/ con la
misma ruta que su foto (.webp) y reescribe src/data/recortesGenerados.ts, que
es lo que lee el sitio. Un par sin recorte sale con su foto original.

COMO ESCOGE EL TENIS. rembg separa lo que esta delante del fondo. De lo que
queda, cada figura suelta se mira por separado y se descarta si:
  - es rectangular y maciza (una caja),
  - toca el borde de la foto (el tenis esta cortado),
  - no tiene proporcion de tenis de lado (dos tenis encimados, una mano
    metida, un tenis visto de frente o desde arriba).
De las que pasan se queda la mas grande. Si no pasa ninguna, NO hay recorte:
es preferible la foto original a un recorte con media puntera, una mano o dos
tenis pegados haciendose pasar por uno. No bajes los umbrales para subir el
conteo; revisa la hoja.

FOTO DE ORIGEN. Si existe catalogo/fuentes-recorte/<ruta de la foto>, se
recorta esa en vez de la publicada. Sirve para los pares cuya portada es una
ilustracion o un montaje: el recorte sale de la foto real.

Cada recorte guarda en el manifiesto la huella de la foto de la que salio.
Si alguien cambia la foto bajo el mismo nombre, la siguiente corrida lo
nota y lo rehace; mientras tanto el sitio sigue mostrando el recorte viejo,
asi que hay que correr esto despues de reemplazar portadas.

Necesita rembg, Pillow, numpy y scipy (scripts/requirements-recortes.txt).
"""

import argparse
import hashlib
import json
import random
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

RAIZ = Path(__file__).resolve().parent.parent
FOTOS = RAIZ / "public" / "catalogo"
RECORTES = RAIZ / "public" / "recortes"
FUENTES = RAIZ / "catalogo" / "fuentes-recorte"
MANIFIESTO = RAIZ / "src" / "data" / "recortesGenerados.ts"
CATALOGO_TS = RAIZ / "src" / "data" / "catalogoGenerado.ts"

MODELO = "birefnet-general"

# Lienzo de salida: 3:2, el tenis centrado ocupando OCUPA del ancho o del alto,
# lo que llegue primero. Todos con la misma proporcion y el mismo aire, que es
# lo que los hace verse "uniformes" uno al lado del otro.
LIENZO = (3, 2)
ANCHO_MAX = 1200
OCUPA = 0.86
# Nunca se agranda mas que esto: un tenis de 300 px estirado a 1200 se ve
# borroso, y borroso flotando sobre negro se nota mas que en su foto.
AMPLIACION_MAX = 1.5
# Por debajo de este ancho de salida el recorte se marca de baja resolucion.
ANCHO_BAJA = 600

# Figuras: por debajo de esta fraccion de la foto es ruido (cordones sueltos,
# un logo de la caja, la etiqueta).
AREA_MIN = 0.02
# Proporcion ancho/alto de un tenis de perfil. Un tenis bajo anda por 2,2-2,8
# y una bota por 1,5. Dos tenis encimados de frente quedan por debajo; uno
# visto desde arriba, tambien.
PROPORCION_MIN = 1.45
PROPORCION_MAX = 3.4
# Relleno de la caja delimitadora. Una caja de carton llena casi todo su
# rectangulo; un tenis de lado deja aire arriba de la puntera y del talon.
RELLENO_CAJA = 0.9
# Pixeles de margen para decidir que una figura toca el borde.
MARGEN_BORDE = 3
# Cuanto puede tocar el borde un tenis entero. Las fotos de proveedor vienen
# tan ajustadas que la punta o el talon rozan el marco (8% de la altura en un
# Guess Walen completo); un tenis cortado de verdad, o una pierna que entra
# desde abajo, lo toca en un tramo largo.
CONTACTO_MAX = 0.15
# Un segundo tenis suelto entra al recorte si mide al menos esto del primero.
PAR_MIN = 0.4

# Lo que el dueno descarto al revisar las hojas: una ruta /catalogo/... por
# linea. Esas portadas no llevan recorte aunque el script lo de por bueno (una
# mordida donde estaba la mano, dos tenis encimados que no convencen).
DESCARTADOS = RAIZ / "catalogo" / "recortes-descartados.txt"
# Lo que ya se proceso, con la huella de su foto y si salio recorte o no. Los
# rechazos no quedan en el manifiesto y sin esto se volverian a intentar en
# cada corrida, que son la mayoria y lo mas lento.
ESTADO = RAIZ / "catalogo" / "recortes-estado.json"
POR_HOJA = 50


def huella(ruta):
    return hashlib.sha256(ruta.read_bytes()).hexdigest()[:16]


def portadas():
    """Las portadas del catalogo, tal como las publica el sitio."""
    texto = CATALOGO_TS.read_text(encoding="utf-8")
    vistas = []
    for bloque in re.finditer(r'"images":\s*\[\s*"([^"]+)"', texto):
        url = bloque.group(1)
        if url.startswith("/catalogo/") and url not in vistas:
            vistas.append(url)
    return vistas


def descartados():
    if not DESCARTADOS.exists():
        return set()
    lineas = DESCARTADOS.read_text(encoding="utf-8").splitlines()
    return {l.strip() for l in lineas if l.strip() and not l.lstrip().startswith("#")}


def archivo_de(url):
    return FOTOS / url[len("/catalogo/"):]


def origen_de(url):
    alterna = FUENTES / url[len("/catalogo/"):]
    return alterna if alterna.exists() else archivo_de(url)


def destino_de(url):
    return Path(url[len("/catalogo/"):]).with_suffix(".webp")


def escoger_tenis(alfa):
    """Devuelve (mascara del tenis, motivo). Mascara None si no hay ninguno."""
    alto, ancho = alfa.shape
    solido = alfa > 128
    # Una pasada de apertura despega figuras unidas por un hilo (un cordon que
    # cuelga, la sombra entre dos tenis) sin comerse el contorno.
    solido = ndimage.binary_opening(solido, iterations=2)
    etiquetas, n = ndimage.label(solido)
    if n == 0:
        return None, "sin figura"

    candidatos = []
    motivos = []
    total = alto * ancho
    for i, corte in enumerate(ndimage.find_objects(etiquetas), start=1):
        if corte is None:
            continue
        sy, sx = corte
        figura = etiquetas == i
        area = int(figura.sum())
        if area < AREA_MIN * total:
            continue
        bh, bw = sy.stop - sy.start, sx.stop - sx.start
        proporcion = bw / bh
        relleno = area / (bw * bh)
        m = MARGEN_BORDE
        contacto = max(
            figura[:, :m].any(axis=1).sum() / bh,
            figura[:, -m:].any(axis=1).sum() / bh,
            figura[:m, :].any(axis=0).sum() / bw,
            figura[-m:, :].any(axis=0).sum() / bw,
        )
        toca = contacto > CONTACTO_MAX
        if relleno >= RELLENO_CAJA:
            motivos.append("caja")
        elif toca:
            motivos.append("cortado por el borde")
        elif not PROPORCION_MIN <= proporcion <= PROPORCION_MAX:
            motivos.append(f"no es perfil ({proporcion:.2f})")
        else:
            candidatos.append((area, i, proporcion))

    if not candidatos:
        return None, ", ".join(sorted(set(motivos))) or "figuras muy chicas"

    # Vale el tenis solo o el par completo. Si los dos tenis salen separados,
    # se quedan los dos: el segundo entra si mide al menos PAR_MIN del primero,
    # que es lo que lo distingue de un tenis de fondo, chico y desenfocado.
    candidatos.sort(reverse=True)
    mayor = candidatos[0][0]
    elegidos = [c for c in candidatos if c[0] >= PAR_MIN * mayor]
    mascara = np.isin(etiquetas, [c[1] for c in elegidos])
    # La apertura recorta un pelo el contorno; se recupera dilatando dentro de
    # lo que rembg ya habia marcado como tenis.
    mascara = ndimage.binary_dilation(mascara, iterations=2) & (alfa > 8)
    if len(elegidos) > 1:
        return mascara, "par separado"
    return mascara, f"perfil {elegidos[0][2]:.2f}"


def recortar(sesion, origen):
    from rembg import remove

    foto = ImageOps.exif_transpose(Image.open(origen)).convert("RGB")
    cortada = remove(foto, session=sesion)
    alfa = np.array(cortada.split()[-1])
    mascara, motivo = escoger_tenis(alfa)
    if mascara is None:
        return None, motivo, None

    rgba = np.array(cortada)
    rgba[..., 3] = np.where(mascara, rgba[..., 3], 0)
    ys, xs = np.nonzero(rgba[..., 3] > 8)
    caja = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    tenis = Image.fromarray(rgba).crop(caja)

    tw, th = tenis.size
    lw_rel, lh_rel = LIENZO
    # Escala que hace caber el tenis en el lienzo mas grande permitido.
    ancho_lienzo = ANCHO_MAX
    alto_lienzo = ancho_lienzo * lh_rel // lw_rel
    escala = min(ancho_lienzo * OCUPA / tw, alto_lienzo * OCUPA / th)
    if escala > AMPLIACION_MAX:
        # No se estira de mas: se achica el lienzo para que el tenis ocupe lo
        # mismo con menos pixeles. El navegador lo escala igual que a los demas.
        reduccion = AMPLIACION_MAX / escala
        ancho_lienzo = max(int(ancho_lienzo * reduccion), 2)
        alto_lienzo = ancho_lienzo * lh_rel // lw_rel
        escala = AMPLIACION_MAX
    nuevo = (max(int(tw * escala), 1), max(int(th * escala), 1))
    tenis = tenis.resize(nuevo, Image.LANCZOS)

    lienzo = Image.new("RGBA", (ancho_lienzo, alto_lienzo), (0, 0, 0, 0))
    lienzo.paste(tenis, ((ancho_lienzo - nuevo[0]) // 2, (alto_lienzo - nuevo[1]) // 2), tenis)
    estado = "baja resolucion" if ancho_lienzo < ANCHO_BAJA else "ok"
    return lienzo, motivo, estado


def escribir_manifiesto(entradas):
    lineas = [
        "/* GENERADO por scripts/recortar-fondos.py --aplicar. No editar a mano.",
        "   Portada del par -> su recorte sin fondo. Un par que no aparece aqui",
        "   sale con su foto original. `huella` es la de la foto de origen: si",
        "   cambia, la siguiente corrida rehace el recorte. */",
        "",
        "export const RECORTES: Record<string, { src: string; huella: string }> = {",
    ]
    for url in sorted(entradas):
        e = entradas[url]
        lineas.append(f"  {json.dumps(url)}: {{ src: {json.dumps(e['src'])}, huella: {json.dumps(e['huella'])} }},")
    lineas.append("};")
    MANIFIESTO.write_text("\n".join(lineas) + "\n", encoding="utf-8")


def leer_manifiesto():
    if not MANIFIESTO.exists():
        return {}
    texto = MANIFIESTO.read_text(encoding="utf-8")
    entradas = {}
    for m in re.finditer(r'^\s*("[^"]+"): \{ src: ("[^"]+"), huella: ("[^"]+") \},$', texto, re.M):
        entradas[json.loads(m.group(1))] = {"src": json.loads(m.group(2)), "huella": json.loads(m.group(3))}
    return entradas


def hojas(filas, carpeta):
    """Laminas de POR_HOJA recortes, numerados, con su original al lado.

    Solo van las fotos que SI tienen recorte: son las que hay que aprobar. Se
    numeran de corrido para responder "descarta 3, 17, 41", e indice.csv dice
    a que portada corresponde cada numero.

    El recorte va sobre obsidiana y no sobre un damero porque asi es como lo
    vera el cliente: un halo de fondo mal quitado solo se nota sobre negro.
    """
    from PIL import ImageDraw

    con_recorte = [f for f in filas if f["destino"]]
    (carpeta / "indice.csv").write_text(
        "numero,portada\n" + "".join(f"{i},{f['url']}\n" for i, f in enumerate(con_recorte, 1)),
        encoding="utf-8",
    )
    celda = (480, 320)
    paso = celda[1] + 42
    obsidiana, basalto = (13, 13, 13), (26, 26, 26)
    escritas = []
    for pagina in range(0, len(con_recorte), POR_HOJA):
        tanda = con_recorte[pagina:pagina + POR_HOJA]
        lamina = Image.new("RGB", (celda[0] * 2 + 24, len(tanda) * paso), basalto)
        dibujo = ImageDraw.Draw(lamina)
        for k, f in enumerate(tanda):
            numero = pagina + k + 1
            y = k * paso
            original = ImageOps.exif_transpose(Image.open(f["origen"])).convert("RGB")
            original.thumbnail(celda)
            lamina.paste(obsidiana, (8, y, 8 + celda[0], y + celda[1]))
            lamina.paste(original, (8 + (celda[0] - original.width) // 2, y + (celda[1] - original.height) // 2))
            x2 = 16 + celda[0]
            lamina.paste(obsidiana, (x2, y, x2 + celda[0], y + celda[1]))
            recorte = Image.open(carpeta / f["destino"]).convert("RGBA")
            recorte.thumbnail(celda)
            lamina.paste(recorte, (x2 + (celda[0] - recorte.width) // 2, y + (celda[1] - recorte.height) // 2), recorte)
            dibujo.rectangle((8, y, 64, y + 30), fill=(30, 58, 138))
            dibujo.text((16, y + 9), f"{numero}", fill=(242, 242, 242))
            color = (200, 200, 200) if f["estado"] == "baja resolucion" else (150, 150, 150)
            dibujo.text((8, y + celda[1] + 6), f"{numero}.  {f['estado']}  -  {f['motivo']}", fill=color)
            dibujo.text((8, y + celda[1] + 20), f["url"], fill=(120, 120, 120))
        nombre = carpeta / f"hoja-{pagina // POR_HOJA + 1:02d}.jpg"
        lamina.save(nombre, "JPEG", quality=88)
        escritas.append(nombre)
    return escritas


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--muestra", type=int, help="procesa N portadas al azar (semilla fija)")
    p.add_argument("--solo", nargs="+", help="rutas /catalogo/... o de archivo")
    p.add_argument("--salida", type=Path, default=RAIZ / "recortes-prueba")
    p.add_argument("--hoja", action="store_true", help="escribe hojas numeradas en --salida")
    p.add_argument("--aplicar", action="store_true", help="escribe public/recortes/ y el manifiesto")
    a = p.parse_args()

    urls = portadas()
    if a.solo:
        pedidas = []
        for s in a.solo:
            s = s.replace("\\", "/")
            if "/catalogo/" in s and not s.startswith("/catalogo/"):
                s = "/catalogo/" + s.split("/catalogo/", 1)[1]
            pedidas.append(s)
        urls = [u for u in pedidas if archivo_de(u).exists()]
    elif a.muestra:
        random.Random(7).shuffle(urls)
        urls = urls[: a.muestra]

    carpeta = RECORTES if a.aplicar else a.salida
    carpeta.mkdir(parents=True, exist_ok=True)
    manifiesto = leer_manifiesto() if a.aplicar else {}
    estado_previo = (
        json.loads(ESTADO.read_text(encoding="utf-8")) if a.aplicar and ESTADO.exists() else {}
    )

    from rembg import new_session

    sesion = new_session(MODELO)
    fuera = descartados()
    filas = []
    for n, url in enumerate(urls, 1):
        if url in fuera:
            if a.aplicar and manifiesto.pop(url, None):
                (RECORTES / destino_de(url)).unlink(missing_ok=True)
            continue
        origen = origen_de(url)
        h = huella(origen)
        visto = estado_previo.get(url)
        if visto and visto["huella"] == h:
            previo = manifiesto.get(url)
            hecho = previo and (RAIZ / "public" / previo["src"].lstrip("/")).exists()
            # Misma foto que la vez pasada: ni el recorte ni el rechazo cambian.
            if hecho or not visto["recorte"]:
                continue
        lienzo, motivo, estado = recortar(sesion, origen)
        destino = None
        if lienzo is not None:
            destino = destino_de(url)
            (carpeta / destino).parent.mkdir(parents=True, exist_ok=True)
            lienzo.save(carpeta / destino, "WEBP", quality=80, method=6)
            if a.aplicar:
                manifiesto[url] = {"src": "/recortes/" + destino.as_posix(), "huella": h}
        elif a.aplicar:
            manifiesto.pop(url, None)
        if a.aplicar:
            # Se guarda foto a foto: el lote completo tarda horas y BiRefNet
            # pide varios GB de memoria, asi que puede morir a medias. Con esto,
            # relanzarlo sigue donde iba en vez de empezar de cero.
            estado_previo[url] = {"huella": h, "recorte": destino is not None, "motivo": motivo}
            ESTADO.write_text(json.dumps(estado_previo, indent=1, sort_keys=True), encoding="utf-8")
            escribir_manifiesto(manifiesto)
        filas.append({"url": url, "origen": str(origen), "destino": destino, "motivo": motivo,
                      "estado": estado or "sin recorte"})
        print(f"[{n}/{len(urls)}] {estado or 'sin recorte':16} {motivo:28} {url}", flush=True)

    if a.aplicar:
        # Recortes de portadas que ya no existen: se quitan del manifiesto para
        # que ningun par apunte a la foto de otro.
        vigentes = set(portadas())
        for url in list(manifiesto):
            if url not in vigentes:
                manifiesto.pop(url)
        escribir_manifiesto(manifiesto)

    if a.hoja:
        # Las hojas van siempre a --salida, nunca a public/: son para revisar.
        a.salida.mkdir(parents=True, exist_ok=True)
        if a.aplicar:
            # Todo lo que esta en el manifiesto, no solo lo de esta corrida: al
            # reanudar un lote cortado, lo hecho antes tambien hay que revisarlo.
            filas = []
            for url in sorted(manifiesto):
                destino = destino_de(url)
                copia = a.salida / destino
                copia.parent.mkdir(parents=True, exist_ok=True)
                copia.write_bytes((RECORTES / destino).read_bytes())
                ancho = Image.open(copia).width
                filas.append({
                    "url": url, "origen": str(origen_de(url)), "destino": destino,
                    "motivo": estado_previo.get(url, {}).get("motivo", ""),
                    "estado": "baja resolucion" if ancho < ANCHO_BAJA else "ok",
                })
        for nombre in hojas(filas, a.salida):
            print(f"Hoja: {nombre.resolve()}")

    if a.aplicar:
        print(f"\nCatalogo: {len(estado_previo)} de {len(urls)} portadas procesadas, "
              f"{len(manifiesto)} con recorte, {len(fuera)} descartadas a mano")
        return
    ok = sum(f["estado"] == "ok" for f in filas)
    baja = sum(f["estado"] == "baja resolucion" for f in filas)
    print(f"\n{len(filas)} procesadas: {ok} ok, {baja} baja resolucion, {len(filas) - ok - baja} sin recorte")


if __name__ == "__main__":
    sys.exit(main())
