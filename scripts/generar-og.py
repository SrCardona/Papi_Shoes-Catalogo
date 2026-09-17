"""Dibuja public/og.jpg, la tarjeta que aparece al pegar un enlace del sitio.

Es la primera imagen del negocio para quien recibe un enlace por WhatsApp, y
hasta ahora no existia ninguna: el mensaje salia sin foto. No se genera en cada
compilacion porque no cambia nunca; se corre a mano cuando se quiera retocar.

    python scripts/generar-og.py

Las medidas son las que piden WhatsApp, Facebook e Instagram: 1200x630. Las
fichas de producto no usan esta imagen sino la foto del par, que es mejor
anzuelo; esta queda para la portada y para el resto de las paginas.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
DESTINO = RAIZ / "public" / "og.jpg"

ANCHO, ALTO = 1200, 630

# Los mismos tokens de src/index.css. Si cambia la paleta del sitio, cambia aca.
OBSIDIANA = (13, 13, 13)
MARMOL = (242, 242, 242)
PLATA = (192, 192, 192)
LAPIS = (30, 58, 138)

# Anton no esta instalada en el sistema; Impact es la alternativa que el propio
# `--font-display` del sitio ya declara, y es la que mas se le parece.
TITULARES = ["impact.ttf", "Haettenschweiler.ttf", "arialbd.ttf"]
TEXTO = ["segoeuisb.ttf", "segoeuib.ttf", "seguisb.ttf", "arialbd.ttf"]


def carga(nombres: list[str], tamano: int) -> ImageFont.FreeTypeFont:
    """La primera fuente del sistema que exista, o la de PIL como ultimo recurso."""
    for nombre in nombres:
        try:
            return ImageFont.truetype(nombre, tamano)
        except OSError:
            continue
    return ImageFont.load_default()


def ancho_espaciado(texto: str, fuente: ImageFont.FreeTypeFont, espaciado: int) -> int:
    total = sum(fuente.getbbox(c)[2] - fuente.getbbox(c)[0] for c in texto)
    return total + espaciado * max(0, len(texto) - 1)


def escribe_espaciado(
    lienzo: ImageDraw.ImageDraw,
    centro_x: int,
    y: int,
    texto: str,
    fuente: ImageFont.FreeTypeFont,
    color: tuple[int, int, int],
    espaciado: int,
) -> None:
    """Texto centrado con tracking, que es lo que hace legibles las versalitas."""
    x = centro_x - ancho_espaciado(texto, fuente, espaciado) // 2
    for caracter in texto:
        izq, _, der, _ = fuente.getbbox(caracter)
        lienzo.text((x - izq, y), caracter, font=fuente, fill=color)
        x += (der - izq) + espaciado


def main() -> None:
    lamina = Image.new("RGB", (ANCHO, ALTO), OBSIDIANA)
    lienzo = ImageDraw.Draw(lamina)

    # Columnata de fondo: cinco fustes de luz, como en la portada del sitio.
    columna_ancho, separacion = 78, 62
    total = 5 * columna_ancho + 4 * separacion
    x = (ANCHO - total) // 2
    for _ in range(5):
        for fila in range(ALTO):
            # Se apaga hacia abajo, igual que el degradado de la fachada.
            fuerza = int(16 * (1 - fila / ALTO))
            if fuerza > 0:
                lienzo.line(
                    [(x, fila), (x + columna_ancho, fila)],
                    fill=(
                        OBSIDIANA[0] + fuerza,
                        OBSIDIANA[1] + fuerza,
                        OBSIDIANA[2] + fuerza,
                    ),
                )
        x += columna_ancho + separacion

    # Marco de hilo: el borde fino de todo el sitio.
    lienzo.rectangle([36, 36, ANCHO - 37, ALTO - 37], outline=(38, 38, 38), width=1)

    centro = ANCHO // 2

    escribe_espaciado(
        lienzo, centro, 196, "PAPI SHOES", carga(TITULARES, 152), MARMOL, 6
    )

    # Estilobato: la linea sobre la que se asienta el nombre.
    lienzo.line([(centro - 190, 392), (centro + 190, 392)], fill=(70, 70, 70), width=1)
    lienzo.line([(centro - 46, 392), (centro + 46, 392)], fill=PLATA, width=1)

    escribe_espaciado(
        lienzo, centro, 428, "EL TEMPLO DE LOS TENIS", carga(TEXTO, 27), PLATA, 9
    )
    escribe_espaciado(
        lienzo,
        centro,
        502,
        "ORIGINALES CON LEGIT CHECK   ·   SNEAKERS DE USO DIARIO",
        carga(TEXTO, 17),
        (125, 125, 125),
        5,
    )

    # Un hilo de lapislazuli abajo: el acento de la marca, sin robar atencion.
    lienzo.line([(0, ALTO - 4), (ANCHO, ALTO - 4)], fill=LAPIS, width=4)

    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    lamina.save(DESTINO, "JPEG", quality=92, optimize=True)
    print(f"OK {DESTINO.relative_to(RAIZ)}  {DESTINO.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
