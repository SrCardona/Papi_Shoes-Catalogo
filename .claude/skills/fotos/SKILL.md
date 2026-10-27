---
name: fotos
description: Procedimiento oficial para cargar pares nuevos al catálogo de Papi Shoes. Úsala siempre que el usuario diga cosas como "procesa las fotos nuevas", "subí fotos", "cargué pares nuevos", "hay fotos en la bandeja", "nuevas referencias", "voy a subir fotos" o escriba /fotos, y siempre que aparezcan fotos en public/catalogo/_entrada/ o fotos sueltas en public/catalogo/. Toda carga de pares nuevos sigue esta skill, sin excepciones.
---

# Cargar pares nuevos al catálogo

Sigue los pasos en orden. No te saltes ninguno y no avances cuando un paso
diga que esperes mi aprobación. Si una instrucción de aquí choca con
CLAUDE.md, manda CLAUDE.md y avísame del choque.

## 0. Preparación

- Lee CLAUDE.md.
- Verifica que exista el venv de herramientas (tools/.venv, ignorado por git)
  con rembg, onnxruntime y Pillow, y el modelo
  ~/.rembg/models/birefnet-general/birefnet-general.onnx. Si el venv no
  existe, créalo siguiendo la sección de CLAUDE.md antes de seguir. Nada de
  esto puede aparecer en package.json ni afectar el build de Vercel.
- Recuerda: npm run dev usa los datos de producción. No publiques nada desde
  el panel en ningún momento.

## 1. Bandeja

- Las fotos van en public/catalogo/_entrada/.
- Si hay fotos sueltas en public/catalogo/, pásalas a la bandeja.

## 2. Duplicados (npm run entrada, comparación byte a byte)

- **A, foto idéntica:** no la proceses. Dime con cuál foto publicada choca;
  la borro yo.
- **B, otra foto de un par existente:** entra como foto adicional
  (nombre_2.jpg) en la carpeta de ese par. Muéstrame las dos fotos y
  pregúntame antes de agrupar. Si hay duda, van separadas.
- **C, par nuevo:** sigue al paso 3.

## 3. Revisión de cada foto

- Descarta y avísame si la foto tiene contenido sexual, logos o
  ilustraciones de otras marcas ajenas al par (como el fondo de RAW), marcas
  de agua de otras tiendas o texto de proveedor que no se pueda quitar.
- Avísame si mide menos de 600 px de ancho o se ve borrosa.
- La foto de portada de cada par debe ser la más limpia: tenis completo,
  fondo liso si existe, sin manos ni objetos encima si hay otra opción.

## 4. Recorte y limpieza (solo fotos nuevas de _entrada/)

Usa scripts/recortar-entrada.py con el venv de herramientas.

- Antes de tocar nada, copia los originales a lotes/originales/<fecha>/
  (fuera de public/ e ignorada por git).
- Usa BiRefNet solo para DETECTAR dónde está el tenis. No le quites el fondo
  a la foto.
- Recorta en formato cuadrado (1:1), centrado en el tenis, con un margen del
  8 % alrededor para que nunca quede pegado al borde.
- Si el tenis no cabe en un cuadrado sin cortarse (foto muy apaisada), no la
  recortes: el sitio rellena la celda solo.
- Nunca cortes el tenis, los cordones ni la suela. Si la detección no es
  clara, no recortes esa foto y avísame.
- No agrandes fotos pequeñas: eso inventa detalle.
- **Código de inventario** (números o recuadros del proveedor, como "2662"
  en una esquina):
  - a. Si queda fuera del recorte, el recorte ya lo elimina.
  - b. Si queda dentro y está sobre fondo liso o una zona sin el tenis,
    bórralo con la misma técnica de scripts/quitar-recuadro.py.
  - c. Si está encima del tenis o en una zona con mucho detalle, no lo
    borres (inventaría el tenis): avísame para decidir si la foto se usa o
    se descarta.
  - Si te digo que a una foto ya le quité el código a mano, solo recórtala y
    revisa que no hayan quedado manchas donde estaba.
- Genera una hoja de revisión al 100 % con el antes y el después de cada
  foto, marcando cuáles tenían código y cómo se resolvió. Dame la ruta y
  **espera mi aprobación antes de seguir**.

## 5. Datos de cada par (propuesta para que yo confirme)

- Marca, nombre, colorway y línea (Originales o Sneakers).
- **Nombre:** verifícalo contra lo que se lee en la foto (lengüeta,
  plantilla, talón). Si no coincide con lo que yo escribí, avísame (como el
  Vomero 5 que estaba como Vomero 6).
- **Colorway:** obligatorio, en el formato del catálogo ("White / Grey"),
  porque va en el mensaje de WhatsApp. Si no lo sabes, pregúntame; nunca lo
  dejes vacío.
- **Línea:** nunca la deduzcas de la foto; pregúntame si no la indiqué. En
  Sneakers ningún texto puede decir original, auténtico, legit o verificado
  ("OG" como parte del nombre del modelo sí se permite).
- **Horma:** siempre me la preguntas, nunca la deduzcas.
- Con más de 15 fotos, ofréceme responder en lote (una tabla).

## 6. Ubicación

- public/catalogo/<linea>/<marca>/[horma/]nombre.jpg, en minúsculas, con
  guiones y sin acentos. Nunca sobrescribas una foto.
- Las marcas con pocos pares van a "otras", con la marca real dentro del
  nombre del par.

## 7. Registro

- Escribe los datos en catalogo/ajustes/<marca>.json.
- Confírmame precio y precio anterior en precios.csv antes de guardar.
- Corre npm run catalogo. Cada par nuevo recibe una referencia única en
  catalogo/referencias.json y las existentes no cambian. Si aparece una
  referencia repetida, detente y avísame.
- Si alguno de los pares tocados ya fue editado desde el panel, avísame: la
  nube le gana al código.

## 8. Verificación

- npm run lint, npm run marcas y npm run build.
- Capturas de 2 o 3 tarjetas nuevas en escritorio y celular, y el mensaje de
  WhatsApp de una de ellas (con color, referencia y enlace).

## 9. Informe

- Cuántos pares nuevos, en qué línea y en qué marca.
- Cuáles quedaron con marca "Otras" o con datos que debo revisar.
- Fotos recortadas, fotos con código eliminado y fotos descartadas, con el
  motivo.
- Qué fotos quedaron en _entrada/ y por qué (idénticas a una publicada o
  descartadas), para que yo las borre.

## 10. Cierre

- Un commit con el resumen, solo después de mi aprobación.
- No publiques nada desde el panel.
