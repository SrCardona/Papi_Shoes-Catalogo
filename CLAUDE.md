# PAPI SHOES — Contexto del proyecto

Catálogo de tenis con cotización por WhatsApp. No hay carrito ni pasarela de
pago: el objetivo de cada pantalla es llevar a un mensaje de WhatsApp bien
armado. Todo el texto de cara al usuario va en español de Colombia.

## Comandos

```bash
npm run dev       # servidor local
npm run build     # tsc --noEmit && vite build
npm run lint      # tsc --noEmit && eslint src
npm run entrada   # duplicados de public/catalogo/_entrada/ (fotos nuevas)
npm run catalogo  # precios por marca en catalogo/precios.csv
npm run entregas  # muro de entregas desde el JSON que exporta el panel
npm run marcas    # comprueba que el conteo del menu cuadre con el catalogo
npm run og        # redibuja public/og.jpg, la tarjeta de los enlaces
```

`npm run build` corre ademas `scripts/generar-fichas.mjs`, que escribe dentro de
`dist/` una ficha HTML por par y el `sitemap.xml`. No se versiona nada de eso.

## Stack

React 19 + TypeScript + Vite + Tailwind v4 (sin archivo de config: los tokens
están en `@theme` dentro de `src/index.css`) + react-router-dom. Iconos de
lucide-react. El sitio es estático; el único servidor son tres funciones de
Vercel en `api/`, que guardan lo que edita el panel.

## Dónde viven los datos (esto causa confusión, léelo bien)

Tres fuentes, y en este orden manda cada una:

1. **La nube** — `estado.json` en Vercel Blob, servido por `api/estado.ts`. Es la
   copia compartida: lo que publica el panel y lo que ven todos los visitantes y
   todos los equipos. Si está configurada, gana.
2. **`localStorage`** — llaves `papi_shoes_inventory`, `papi_shoes_settings`,
   `papi_shoes_deliveries`, `papi_shoes_editado`. Copia local: primer pintado y
   respaldo sin conexión. Solo le gana a la nube si `papi_shoes_editado` es
   posterior a lo publicado (y entonces el panel marca "cambios sin publicar").
3. **`src/data/catalogoGenerado.ts`** — lo genera el script desde las fotos.
   Punto de partida. Al regenerarse no se lleva por delante lo del panel: el
   documento de la nube guarda la huella del catálogo con el que se publicó y,
   cuando el código trae otra, `src/lib/catalogo.ts` fusiona par por par. Manda
   el panel en lo suyo —lo que creó, lo que quitó y lo que editó, anotado en
   `catalogo.hiddenIds` y `catalogo.editedIds`— y el código aporta el resto: sus
   pares nuevos y las fotos corregidas de los que nadie tocó. Los ajustes y las
   entregas se siguen tomando de la nube.

   Esas dos listas se deducen comparando contra el código **al editar**, que es
   cuando la comparación vale: después de regenerar, el par del código ya es otro
   y "distinto" dejaría de significar "lo editó el dueño". Por eso se guardan y
   se publican en vez de recalcularse al cargar.

   El muro de entregas tiene su equivalente en `src/data/entregasGeneradas.ts`
   (`npm run entregas`), y ahí está la diferencia que importa: una entrega
   creada en el panel no existe fuera de ese navegador hasta que se publique,
   mientras que una entrega del código se ve en todos los dispositivos sin
   pasar por la nube. Es el piso del muro; lo guardado le gana en el navegador
   donde se editó.

   Lo mismo vale para los ajustes de la tienda, las historias y el anuncio
   emergente: todo eso sale de `INITIAL_SETTINGS` salvo que la nube traiga otra
   cosa. Un número de WhatsApp cambiado solo en el panel no lo ve ningún
   cliente.

Si un cambio en los datos "no se ve", casi siempre es esto. Para volver al
catálogo del código: `localStorage.clear()` en la consola — pero ojo, si la nube
está configurada la próxima carga vuelve a traer lo publicado, y lo que hay que
usar es **Panel › Ajustes › Nube › Traer de la nube** o publicar encima.

La nube se apaga sola cuando faltan sus variables de entorno: sin ellas todo
funciona como antes (código + `localStorage`) y el panel lo dice en el
encabezado. No hay que tocar código para trabajar sin nube.

### Cómo publica el panel

`src/lib/nube.ts` es el único cliente de `/api`, y `StoreContext` lo usa así:
todo cambio sube solo 1,5 s después de la última edición, siempre que haya token
de escritura. La escritura es optimista: se manda el sello del documento sobre el
que se editó y el servidor responde 409 si en la nube ya hay uno más nuevo, en
vez de pisarlo. Las fotos que el dueño sube desde el dispositivo se guardan
aparte con `api/imagen.ts` (nombre = hash del contenido) y en el catálogo queda su
URL; nunca se publica el usuario ni el hash del PIN.

Hacia el otro lado, volver a la pestaña o a la ventana consulta si hay algo más
nuevo publicado (`refrescarDesdeNube`), con dos frenos: no trae nada si este
navegador tiene cambios sin publicar, y no consulta dos veces en cinco segundos.
No hay temporizador: nadie mira una pestaña que no está al frente.

En desarrollo no hay funciones: `vite.config.ts` reenvía `/api` al sitio
publicado (`VITE_API_ORIGIN`, o `ORIGEN_API_POR_DEFECTO` en ese mismo archivo).
Ojo: eso significa que `npm run dev` edita los datos de producción.

## Las fotos se sirven encogidas

`SmartImage` no pide el archivo de `public/catalogo/` tal cual: lo pide a traves
de `/_vercel/image`, que lo redimensiona y lo convierte a AVIF o WebP segun lo
que acepte el navegador. Las fotos de proveedor pesan 156 KB de promedio y la
tarjeta mide 175 px en un telefono; sin esto, llenar la primera pantalla del
catalogo costaba 1,5 MB.

**La lista `ANCHOS` de `SmartImage.tsx` tiene que ser identica a `images.sizes`
de `vercel.json`.** Pedir un ancho que no este declarado alli devuelve 400 y la
foto no aparece. Si se toca una, se toca la otra.

Solo se optimiza lo que sirve este mismo sitio (rutas que empiezan por `/`).
Una foto subida desde el panel vive en el almacen, con otro dominio, y pasa tal
cual: declararla mal dejaria sin foto justo a los pares que cargo el dueno.

En `npm run dev` no hay optimizador —es un servicio de Vercel, no de Vite— y se
sirve el archivo original. Es la misma foto, sin encoger.

La primera fila de la columnata lleva `priority`: carga sin diferir, con
prioridad alta y sin el fundido de entrada, porque es la que mide el LCP.

## Lo que ve WhatsApp al pegar un enlace

Todo el negocio termina en un mensaje de WhatsApp, y su robot no ejecuta
JavaScript: lee el HTML tal como sale del servidor. Por eso las 615 fichas se
escriben como archivos estaticos al compilar (`scripts/generar-fichas.mjs`):
`dist/producto/<id>/index.html`, cada una con su titulo, su descripcion, su foto
y sus datos estructurados. Vercel sirve el archivo antes de mirar la reescritura
hacia `index.html`, asi que el robot recibe la ficha y el visitante recibe la
misma aplicacion de siempre.

Cambiar `document.title` desde React sigue sirviendo para la pestana del
navegador, pero nunca le llega al robot. No lo quites pensando que lo reemplaza
el script: cubren cosas distintas.

Si se editan las etiquetas `<meta>` de `index.html`, hay que revisar ese script:
busca cada una por nombre y falla si no la encuentra, a proposito.

## Estructura

```
api/                estado.ts (leer/guardar), sesion.ts (PIN + token),
│                   imagen.ts (fotos), _lib/ (almacén, sesión, intentos, saneado)
catalogo/           precios.csv, ajustes/<marca>.json, llegadas.json (generado),
│                   referencias.json (generado), catalogo-papishoes.json (generado)
lotes/              zips de lotes sin desempacar — no se versiona
public/catalogo/    las fotos, <linea>/<marca>/[horma/]
public/entregas/    las fotos del muro (generadas, con hash en el nombre)
src/
├── pages/          HomePage, CatalogPage (+ OriginalsPage, SneakersPage),
│                   ProductPage, AboutPage (El Templo), FaqPage, AdminPage
├── components/
│   ├── layout/     Navbar, BrandDropdown (menús de marca), Footer, Layout
│   └── ui/         SneakerColumn, Colonnade, FilterRail, SmartImage,
│                   DeliveryWall, HighlightRail, SectionHeader, TempleMark
├── admin/          SneakerForm, QuickEditor, DeliveryManager, SettingsPanel,
│                   NubeSync (estado de la nube y publicación manual)
├── context/        StoreContext (estado global + nube + localStorage)
├── hooks/          useCatalogFilters (todo el filtrado y orden),
│                   useMarcasPorLinea (las marcas del menú de navegación)
├── lib/            nube.ts (cliente de /api), security.ts (saneamiento),
│                   validation.ts, catalogo.ts (huella y fusión),
│                   marcas.ts (marcas por línea), utils.ts
└── data/           initialData.ts, catalogoGenerado.ts, entregasGeneradas.ts
                    y fondosFotos.ts
                    (GENERADOS, no editar)
scripts/            generar-catalogo, generar-entregas, revisar-entrada,
                    verificar-marcas, generar-fichas (fichas + sitemap, corre
                    dentro del build), generar-og.py, quitar-recuadro.py,
                    fondos-fotos.py (fondo de cada celda, corre en catalogo)
```

Las carpetas y archivos de `api/` que empiezan por `_` no se convierten en rutas:
ahí va el código compartido. `api/_lib/estado.ts` importa los validadores de
`src/lib/`, así que esos módulos tienen que seguir corriendo en Node: nada de
`import.meta.env`, `window` ni `document` dentro de `validation.ts` o
`security.ts`.

### Tres reglas de las funciones que no se pueden relajar

Romper cualquiera de las dos primeras devuelve **500 en producción y nada en
local**, porque en desarrollo estas funciones no se ejecutan: `/api` se reenvía
al sitio publicado.

1. **Un método por exportación con su nombre** (`export function GET`), nunca
   `export default`. Vercel lee el handler por defecto como la firma vieja
   `(request, response)`, ignora la `Response` que devuelvas y la función muere
   sin contestar. Con los métodos por nombre, el runtime responde 405 solo.
2. **Los imports relativos llevan `.js`**, tanto en `api/**` como en los módulos
   de `src/` que las funciones alcanzan (hoy `src/lib/validation.ts` →
   `./security.js`). Vercel no empaqueta: compila archivo por archivo y lo corre
   con Node en modo ESM, que exige la extensión. TypeScript y Vite resuelven ese
   `.js` al `.ts` sin quejarse, así que la extensión no molesta a nadie.
3. `vercel.json` deja `/api` fuera del reenvío al `index.html`
   (`"source": "/((?!api/).*)"`). Sin eso, las rutas de la aplicación se comen a
   las funciones.

Para ver el estado del servidor publicado, sin exponer nada:
`curl https://papi-shoes-catalogo.vercel.app/api/sesion` responde qué falta
(`faltaPin`, `faltaSecreto`, `nube`).

## Las dos líneas del catálogo

- **Originales** (`category: 'originales'`, ruta `/originales`): pares con legit
  check, llevan `isOriginalCertified`.
- **Sneakers** (`category: 'general'`, ruta `/sneakers`): uso diario, NO se
  venden como originales. Antes se llamaba "Streetwear" y "Sala II";
  `/streetwear` redirige a `/sneakers`.

Nunca describir un par de la línea Sneakers como original o auténtico.

La línea va **siempre por delante de la marca**, y por eso ningún atajo lleva a
una marca suelta: los menús de la barra apuntan a `/originales?marca=X` o
`/sneakers?marca=X`, y el muro de marcas de la portada manda cada una a la línea
donde tenga más pares (empate: Originales, que es lo prudente). Un enlace a
`/catalogo?marca=X` mezclaría las dos y el cliente daría por verificado un par
de uso diario. Las marcas de esos menús salen del catálogo con
`lib/marcas.ts` —nunca escritas a mano—.

### Marcas con pocas referencias: "Otras marcas"

Una marca necesita **al menos `MINIMO_PARA_APARTADO_PROPIO` pares (hoy 5) en esa
línea** para tener su propia entrada en el desplegable. Las que no llegan caen en
"Otras marcas", junto con los pares que el generador etiquetó `Otras` por no
reconocer la marca. El umbral se evalúa **por línea**: la misma marca puede tener
apartado propio en Sneakers y caer en el grupo dentro de Originales.

`agruparMarcas()` en `lib/marcas.ts` es la **única** fuente de ese reparto, y la
usan el menú, el catálogo y el muro de la portada. No lo recalcules en una
pantalla: si el menú promete 49 pares y al llegar se ven otros, se rompe lo único
que el visitante puede comprobar de un vistazo. `npm run marcas` verifica que los
conteos del desplegable sumen el total de cada línea y que ningún par quede
inalcanzable.

El enlace del grupo es `?marca=otras`, y **no** es una marca: `CatalogPage` lo
traduce a un filtro por el conjunto (`filters.brandGroup`). Es un campo aparte de
`filters.brand` a propósito, porque `Otras` es además el nombre literal de una
marca del catálogo y la comparación de `brand` no distingue mayúsculas: un
centinela ahí dentro chocaría con ella.

El agrupamiento es **solo para navegar**. La barra de filtros del catálogo sigue
ofreciendo todas las marcas por separado, incluidas las pequeñas: quien ya está
filtrando quiere precisión. El muro de la portada, en cambio, solo muestra las
que tienen apartado propio.

## Cargar fotos al catálogo

Hay dos carpetas y conviene no confundirlas:

- **`public/catalogo/`** — las fotos que sirve el sitio, y solo eso. La ruta es
  parte de la URL de cada imagen (`/catalogo/...`), así que no se mueve.
- **`catalogo/`** — lo que se edita a mano para armar el catálogo: `precios.csv`,
  `ajustes/<marca>.json`, `llegadas.json` (cuándo entró cada par, generado),
  `referencias.json` (la referencia PAPI-xxxx de cada par, generado) y
  `catalogo-papishoes.json` (el respaldo que se importa en el panel, generado).

La referencia es única y no cambia entre corridas: `referencias.json` la
anota la primera vez y las siguientes la respetan, como las llegadas. Un par
nuevo toma la que da su hash y, si está ocupada, la siguiente libre. No se
edita a mano ni se borra: borrarlo vuelve a repartir las de los pares que
habían chocado.

Las fotos van en `public/catalogo/<linea>/<marca>/[horma/]archivo.jpg`, una
carpeta por marca. `npm run catalogo` recorre todo, deduce nombre y marca, y
escribe `src/data/catalogoGenerado.ts` + `catalogo/catalogo-papishoes.json`. Las
correcciones manuales (nombre, colorway, horma, descripción, tallas) van en
`catalogo/ajustes/<marca>.json`, por nombre de archivo sin extensión.

Las tallas por defecto salen de la horma (hombre 39–45, mujer 35–40, unisex
37–44). Un lote que no llegó en la curva completa lo dice en su ajuste, con un
rango `"sizes": "40-44"` o una lista `"sizes": [40, 42, 44]`.

Los zips de lotes sin desempacar van en `lotes/`, que no se versiona.

Una marca con pocas referencias va en la carpeta `otras`: todas quedan bajo la
marca `Otras` y comparten un filtro, con la marca real en el nombre del par.
Solo se abre carpeta propia cuando la marca aguanta su propia sección.

El precio va en `catalogo/precios.csv`, una fila `marca:<Marca>,precio,antes`.
Cada marca conserva el suyo cuando entra la siguiente, así que no uses
`--precio` para un lote nuevo: pisaría el de todas las demás.

Solo el guion bajo agrupa varias fotos en un par (`modelo_2.jpg`). Un `(1)` o
un `-2` quedan como pares distintos, porque los catálogos los usan para
colorways diferentes.

### Cómo se nombra un par

El nombre lleva **la referencia, no el color**. El color vive en `colorway` y
solo en `colorway`.

- Si el colorway tiene nombre propio, ese nombre *es* la referencia y va
  completo: "Air Jordan 5 Retro Raging Bull", "Nike Dunk Low Panda".
- Si el colorway no tiene nombre propio —pasa seguido—, el par se queda con el
  nombre de la referencia a secas y el color queda solo en `colorway`. Dos
  colores del mismo modelo comparten nombre y se distinguen por ahí: las dos
  Roma BMW se llaman "Puma Roma BMW M Motorsport", una con `Black / White` y
  otra con `Triple White`.
- El color entra al nombre **únicamente cuando no sabemos la referencia**, que
  es el caso de las marcas sueltas de `otras`: "Diesel Running Gris / Navy".

### Procesar fotos nuevas — PROCEDIMIENTO OBLIGATORIO

Se dispara cuando el dueño dice **"procesa las fotos nuevas"** (o `/fotos`), y
también sin que lo pida si aparecen imágenes en `public/catalogo/_entrada/` o
sueltas en `public/catalogo/`. Los pasos no se saltan ni se reordenan.

`public/catalogo/_entrada/` es la bandeja: ahí caen las fotos como las manda el
proveedor (`WhatsApp Image...`, `IMG_1234`). No se versiona —solo su
`.gitkeep`— y `walk()` en `scripts/generar-catalogo.mjs` salta toda carpeta que
empiece por `_`, así que lo que esté ahí nunca sale publicado.

1. **Bandeja.** Mover a `_entrada/` cualquier foto suelta en `public/catalogo/`
   que no esté dentro de `<linea>/<marca>/`. El dueño las suele dejar en
   `public/catalogo/sneakers/`, y ahí el generador las publicaría como pares
   "Otras" con nombre de WhatsApp.
2. **Duplicados: tres casos, no dos, antes de preguntar nada.** `npm run entrada`
   compara el SHA-256 de cada foto contra todo `public/catalogo/` y contra la
   propia bandeja. Ese hash solo separa el caso A de los otros dos; el resto se
   decide mirando la foto. No se agrega comparación perceptual sin permiso,
   porque un falso positivo descartaría un colorway parecido pero distinto.

   - **Caso A — archivo idéntico.** **No se procesa**: se queda en `_entrada/`,
     se reporta contra qué choca y la borra el dueño.
   - **Caso B — foto distinta de un par que ya está en el catálogo.** **No se
     descarta**: entra como foto adicional del par, con sufijo de guion bajo
     (`nombre_2.jpg`, `_3.jpg`, el siguiente libre), en la **misma** carpeta que
     la original. No se pregunta marca ni horma ni se agrega nada a
     `ajustes/<marca>.json`: ya las define el par. La portada es la foto sin
     sufijo; si la nueva es mejor portada (ver paso 3), se **pregunta** antes de
     renumerar.
   - **Caso C — par que no existe.** Sigue al paso 3.

   Para decidir entre B y C se identifica modelo y colorway y se compara contra
   `src/data/catalogoGenerado.ts` y las carpetas de `public/catalogo/`. Cuando
   parezca el mismo par, **se muestran los dos y se pregunta antes de agrupar**.
   Ante la duda van separados y se avisa: un Stan Smith de talón verde y otro de
   talón azul son dos pares, no dos fotos. Separar de más deja un par repetido,
   que se une después; agrupar de más borra un producto del catálogo.
3. **Revisar cada foto.**
   - Se descarta, avisando, la foto con contenido sexual, logos o ilustraciones
     de marcas ajenas al par (como el fondo de RAW), marcas de agua de otras
     tiendas o texto de proveedor que no se pueda quitar (paso 4).
   - Se avisa si mide menos de 600 px de ancho o se ve borrosa.
   - La portada de cada par es la más limpia: tenis completo, fondo liso si lo
     hay, sin manos ni objetos encima si hay otra opción.
4. **Recortar y limpiar** (solo las fotos nuevas de `_entrada/`, nunca las ya
   publicadas). Lo hace `scripts/recortar-entrada.py` con el venv de
   `tools/.venv` (ver "Entorno para recortar"); si el venv no existe, se crea
   antes de seguir. En seco escribe la hoja en `lotes/revision/<fecha>/`; con
   las fotos descartadas en el paso 3 fuera de la lista, `--aplicar` respalda y
   escribe.
   - Antes de tocar nada, copiar los originales a `lotes/originales/<fecha>/`
     (`--aplicar` lo hace solo): queda fuera de `public/` y `lotes/` no se
     versiona, así que no se publica y sirve para volver atrás.
   - BiRefNet (modelo `birefnet-general`, en `~/.rembg/models/`) se usa **solo
     para detectar** dónde está el tenis. **No se le quita el fondo a la foto.**
   - Recorte cuadrado (1:1), centrado en el tenis, con 8 % de margen alrededor
     para que nunca quede pegado al borde.
   - Si el tenis no cabe en un cuadrado sin cortarse (foto muy apaisada), no se
     recorta: el sitio rellena la celda solo (color del borde o foto
     difuminada).
   - **Nunca se corta el tenis, los cordones ni la suela.** Si la detección no
     es clara, esa foto no se recorta y se avisa.
   - No se agrandan fotos pequeñas: eso inventa detalle.
   - **Código de inventario** (números o recuadros del proveedor, como "2662" en
     una esquina):
     a. Si queda fuera del recorte, el recorte ya lo elimina.
     b. Si queda dentro y está sobre fondo liso o en una zona sin el tenis, se
        borra con la técnica de `scripts/quitar-recuadro.py`.
     c. Si está encima del tenis o en una zona con mucho detalle, **no se
        borra** (inventaría el tenis): se avisa para que el dueño decida si la
        foto se usa o se descarta.
   - Hoja de revisión **al 100 %** con el antes y el después de cada foto,
     marcando cuáles tenían código y cómo se resolvió. **Se espera la
     aprobación del dueño antes de seguir.** El detector solo ve recuadros
     blancos con texto oscuro cerca del borde de la foto: un número suelto o
     un código en el centro no lo marca, y se busca a ojo en la hoja.
5. **Proponer los datos de cada par para que el dueño confirme.**
   - Marca, nombre, colorway y línea. Si el nombre del archivo ya dice el
     modelo, se usa de base.
   - **Nombre:** se verifica el modelo contra lo que se lee en la foto
     (lengüeta, plantilla, talón). Si no coincide con lo que escribió el dueño,
     se avisa (pasó con un Vomero 5 que venía como Vomero 6). Si la silueta no
     se reconoce, se dice claro en vez de inventar.
   - **Colorway: obligatorio**, en el formato del catálogo (`White / Grey`),
     porque va en el mensaje de WhatsApp. Si no se sabe, se pregunta; nunca
     queda vacío.
   - **Línea: nunca se deduce de la foto**; se pregunta si el dueño no la dijo.
     En Sneakers ningún texto dice original, auténtico, legit ni verificado
     ("OG" como parte del nombre del modelo sí vale).
   - **Horma: siempre se pregunta**, nunca se deduce de la foto ni del color.
   - Se aceptan respuestas cortas ("adidas samba, unisex"). Con más de 15 fotos
     se ofrece responder en lote, con una tabla.
6. **Ubicar.** `public/catalogo/<linea>/<marca>/[horma/]nombre.jpg`: marca en
   minúsculas con guiones; subcarpeta de horma solo si no es unisex; nombre en
   minúsculas, con guiones, sin acentos, espacios ni paréntesis; `.jfif` y
   `.jpeg` pasan a `.jpg`. **Si el destino ya existe no se sobrescribe**: se
   avisa y se pregunta si es otro colorway. Marcas con pocos pares van a
   `otras`, con la marca real dentro del nombre del par.
7. **Registrar y generar.**
   - Escribir nombre, colorway y descripción en `catalogo/ajustes/<marca>.json`
     sin pisar lo que ya está (crearlo si falta).
   - Confirmar precio y precio anterior en `precios.csv` antes de guardar; si la
     marca ya tiene fila, proponer esa.
   - `npm run catalogo`. Cada par nuevo recibe su referencia en
     `catalogo/referencias.json` y las existentes no cambian. **Si aparece una
     referencia repetida, se detiene todo y se avisa.**
   - Si alguno de los pares tocados ya fue editado desde el panel
     (`catalogo.editedIds` en la nube), se avisa: ahí la nube le gana al código.
8. **Verificar.**
   - `npm run lint`, `npm run marcas` y `npm run build`.
   - Comprobar la agrupación: cada par con varias fotos es **un** producto con
     todas sus fotos en `images`, el total no creció por las fotos adicionales
     y toda ruta de imagen existe en disco. Si un par quedó partido, se arregla
     y se dice qué pasó.
   - Capturas de 2 o 3 tarjetas nuevas en escritorio y celular, y el mensaje de
     WhatsApp de una de ellas (con color, referencia y enlace).
9. **Informe.** Cuántos pares nuevos, en qué línea y marca; cuáles quedaron con
   marca "Otras" o con datos por revisar; fotos recortadas, fotos con código
   eliminado y fotos descartadas, con el motivo; y qué fotos quedaron en
   `_entrada/` y por qué (idénticas a una publicada o descartadas), que las
   borra el dueño.
10. **Cerrar.** Un commit con el resumen. **No se publica nada desde el panel**:
    `npm run dev` usa los datos de producción.

Nunca: inventar la horma o la línea, dejar un colorway vacío, sobrescribir una
foto, cortar el tenis al recortar, quitarle el fondo, agrandar una foto pequeña,
agrupar dos colorways distintos como un mismo par, procesar un archivo idéntico
o editar `src/data/catalogoGenerado.ts` a mano.

### Entorno para recortar

`scripts/recortar-entrada.py` corre en su propio venv, `tools/.venv`, que git
ignora. No entra a `package.json` ni toca el build de Vercel: es herramienta
local de quien carga fotos. Desde cero, en la raíz del proyecto:

```bash
py -m venv tools/.venv
tools/.venv/Scripts/python -m pip install "rembg[cpu]" pillow numpy
```

El modelo `birefnet-general` vive en `~/.rembg/models/`; si falta, rembg lo
descarga la primera vez (unos 900 MB). La instalación necesita red: dentro del
entorno aislado de Claude Code pypi.org no resuelve.

### Recuadro del proveedor

Muchas fotos traen el codigo del proveedor en un recuadro blanco redondeado
("5031-3", "3382H", "J"). `python scripts/quitar-recuadro.py` lo detecta y lo
borra copiando un trozo real de fondo de la misma foto; sin `--aplicar` solo
reporta y no toca nada.

Solo se borra donde el empalme mide limpio. **Borrar es inventar lo que habia
debajo**, y sobre una hoja, el canto de una caja o el tenis mismo el parche se
nota mas que el recuadro. Esas se reportan y se dejan quietas: es mejor un
codigo visible que una mancha. No bajes el umbral para subir el conteo.

**Revisa las hojas al 100%, nunca en miniatura.** `--hoja` escribe hojas 1:1
con el antes y el despues de cada candidato. A tamano reducido un parche malo
pasa por bueno: en una primera pasada se aprobaron 44 fotos mirando miniaturas
y al verlas a tamano real 17 tenian mancha visible, asi que hubo que revertir
las 44 y rehacer el juicio. El numero de empalme ordena bien pero no decide:
hay parches de 12 que fallan porque el recuadro cae sobre el tenis, y otros de
20 que quedan perfectos.

## Cargar entregas al muro

El muro "Ya están en la calle" (`DeliveryWall`) sale de
`src/data/entregasGeneradas.ts`, que escribe `npm run entregas`. El camino
completo:

1. Panel › Entregas › **Exportar entregas** baja un JSON con las entregas y sus
   fotos en base64.
2. Se deja en `catalogo/entregas-exportadas.json` (o se pasa con `--archivo=`).
   Ese JSON **no se versiona**: pesa y duplica lo que ya queda en `public/`.
3. `npm run entregas` extrae cada foto a `public/entregas/`, con el nombre
   `<ciudad>-<barrio>-<mes>-<hash>.jpg`, y escribe el `.ts` con las rutas.
4. Commit de `public/entregas/` y de `src/data/entregasGeneradas.ts`.

El hash del contenido va en el nombre porque una foto reemplazada bajo la misma
ruta se queda cacheada en el navegador durante una hora larga; con el hash, otra
foto es otra URL. `npm run entregas -- --limpiar` borra las fotos que ya no usa
ninguna entrega.

**Por qué existe este camino y no basta el panel:** una entrega creada en el
panel vive en el `localStorage` de ese navegador, y de ahí solo sale publicando
en la nube. Mientras la nube esté vacía, los visitantes ven lo que traiga el
código. Por eso las entregas de verdad tienen que acabar en el repositorio, como
el catálogo.

No hay entregas de ejemplo de respaldo, y es a propósito: las que había eran
fotos de archivo de Unsplash que los clientes veían como si fueran entregas
reales. Sin entregas, la sección simplemente no se muestra.

Regla de privacidad: barrio y ciudad, **nunca dirección exacta**, y permiso del
cliente si sale su cara.

## Reglas de seguridad (no relajar)

- Toda imagen pasa por `sanitizeImageUrl`: solo `https://`, `data:image/...` y
  rutas propias del sitio (`/catalogo/...`). Nada de `javascript:` ni de
  protocolo relativo `//`.
- Todo texto de entrada pasa por `sanitizeText`.
- El PIN del panel se guarda como hash SHA-256 (sin sal), nunca en claro. El
  repositorio no distribuye ninguno: el hash del sitio publicado entra por
  `ADMIN_PIN_HASH` (variable de entorno de Vercel, sin prefijo `VITE_` para que
  no llegue al navegador). Nunca agregues un PIN ni su hash al código: este
  repositorio es público, y el hash de un PIN de pocos dígitos se revierte en un
  segundo. Si alguien lo pide, la respuesta es la variable de entorno.
- **En el sitio compilado la única puerta es el servidor** (`SOLO_SERVIDOR` en
  `AuthContext`, que es `!import.meta.env.DEV`). Sin las variables, el panel
  muestra "Panel cerrado" y no abre para nadie; el alta de PIN local y la
  validación local solo existen en `npm run dev`. Esto se cerró porque un
  despliegue sin variables le ofrecía "crea tu PIN" a cualquiera que abriera
  `/admin`. No lo relajes para "poder entrar rápido".
- El usuario (`ADMIN_USUARIO`, por defecto `papi.cardona`) también se compara en
  el servidor. No es un secreto, pero es un campo más que hay que acertar, y el
  error no dice cuál de los dos falló.
- `ADMIN_SESSION_SECRET` firma las sesiones de escritura. Mismo trato: solo en
  Vercel, nunca en el repositorio, y nunca con prefijo `VITE_`.
- Lo que se importe desde un respaldo pasa por `src/lib/validation.ts` antes de
  entrar al estado.
- Lo que llega a `PUT /api/estado` se vuelve a sanear en el servidor
  (`api/_lib/estado.ts`): no se confía en que el cliente ya lo hizo. Si agregas un
  campo a `StoreSettings`, agrégalo también ahí o no se publicará.
- Escribir en la nube exige el token de `api/sesion.ts`. Ningún endpoint nuevo
  debe escribir sin pasar por `tokenValido`.

## Diseño

Museo / templo: negro obsidiana, gris basalto, plata, azul lapislázuli, blanco
mármol. Tokens en `src/index.css` (`obsidian`, `basalt`, `marble`, `silver`,
`lapis`, `lapis-lit`, `lapis-texto`). Títulos en Anton (`font-display`), texto
en Montserrat. Bordes finos `border-white/8`, mayúsculas con `tracking` amplio
para los rótulos. Sin sombras difusas: la única sombra permitida es la de piso
bajo un tenis recortado (el del hero y los de las dos líneas), porque sin ella
el recorte se ve pegado.

**Esquinas redondeadas y píldoras (rediseño v2).** Desde el rediseño se aceptan
las esquinas redondeadas y los botones tipo píldora. Solo hay tres radios, en
tokens de `index.css`: `rounded-foto` (22 px, la foto dentro de la tarjeta),
`rounded-tarjeta` (30 px, la tarjeta de un par y bloques parecidos) y
`rounded-sala` (32 px, los bloques grandes: las dos líneas, el llamado final).
Todo botón, chip, buscador o insignia es píldora (`rounded-full`). No inventes
radios sueltos (`rounded-[19px]`): si hace falta otro, va como token. Las piezas
repetidas ya existen como clases en `@layer components`: `.btn` (píldora de
mármol), `.btn-ghost` (la misma, hueca), `.chip` / `.chip-on` y `.campo`
(buscadores). El panel no entra en esta regla.

Nada se mueve solo en la barra: una sola franja de anuncio, quieta, sin cinta
en movimiento. En el celular muestra solo el primer tramo de
`settings.announcement`, hasta el primer "·"; por eso la frase más importante
va primero.

**Un solo acento: el lapislázuli.** Nada de verdes, ámbares ni otros azules en
el sitio público. `lapis` va en rellenos (la barra de anuncio, el descuento
sobre la foto de la ficha, la selección, la luz del hero, la línea del
`architrave`). Como texto o como control fino no se lee —1,9:1 sobre el
negro—, así que para eso está **`lapis-texto`** (`#738ede`, el mismo matiz más
claro, 4,5:1 o más sobre todas las superficies oscuras): rótulos azules, el
deslizante de precio (`accent-lapis-texto`), el check de "copiado" y el punto
de las historias que abren WhatsApp. **El rojo es solo para errores**
(`ErrorBoundary`): ni "Agotado" ni la disponibilidad llevan color. Las
superficies `marble-navy` son fondo, no acento, y se quedan. El panel conserva
sus colores de estado (rojo al borrar, ámbar en "cambios sin publicar", verde
al publicar) porque es la herramienta de la tienda, no la vitrina.

**Las tarjetas de producto van separadas con espacio, ya no con `gap-px`**:
`gap-4` en el celular y `lg:gap-6` en escritorio, cada una su propia tarjeta
(`.column-card`): borde de 1 px, `rounded-tarjeta`, 10 px de aire alrededor de
la foto, que lleva `rounded-foto`, y sin sombra. La rejilla de
`gap-px` sigue valiendo para los bloques que no son tarjetas de par (pilares,
salas, rótulos de la ficha, pie). Sobre la foto de la tarjeta no va nada:
marca y línea, nombre, colorway, precio con el anterior y el descuento en
texto, y "Nuevo" / disponibilidad / "Verificado" van debajo. "Verificado"
solo en Originales, nunca en Sneakers. "Nuevo" sale por la fecha de llegada
(21 días), no por `isNewArrival`, que el generador pone en todos. La
disponibilidad va en gris, sin verde ni ícono. Al pie, fuera del enlace de la
ficha, el botón "Pedir por WhatsApp" (en el celular, "Pedir" con el ícono: la
frase entera no cabe a 12 px), con la plantilla de la tienda y la talla "por
confirmar"; también en los agotados, que se traen bajo encargo.

**La foto de la tarjeta va entera, nunca recortada**, en una celda cuadrada
pintada del color de sus bordes para que no queden franjas.
`scripts/fondos-fotos.py` (Pillow) lo calcula y escribe
`src/data/fondosFotos.ts` (GENERADO); corre solo al final de
`npm run catalogo`. Una foto entra a la lista si sus dos bordes contra las
franjas son al menos 50 % de un mismo color y lo que no lo es va en tres tramos
o menos: el tenis que toca el borde es un tramo, una escena cambia a cada paso.
Si los dos bordes difieren, la celda va mitad y mitad con corte seco detrás de
la foto. Lo que no está en la lista (escenas, fotos subidas desde el panel)
llena la celda con la misma foto ampliada, difuminada y oscurecida, y la foto
entera va encima: no se recorta nada. Las dos capas comparten `src` y `sizes`
(`TAMANOS_FOTO` en `SneakerColumn.tsx`) para que el fondo salga de la caché y
no cueste otra descarga. `fondoDeFoto()` en `lib/utils.ts` es la única puerta a
esa lista.

Legibilidad, también en tokens de `index.css`: `text-lectura` (14 px, el mínimo
de cualquier texto de lectura) y `text-rotulo` (12 px, solo para mayúsculas con
tracking), y dos grises de texto, `text-secundario` y `text-terciario`, ambos
con al menos 4,5:1. No vuelvas a `text-marble/40` y parecidos para texto: con
transparencia el contraste depende del fondo y por debajo de `/50` no cumple.
Si un rótulo no cabe a 12 px, se baja el tracking, no el tamaño.

## Convenciones de código

- Comentarios en español y solo donde explican **por qué**, no qué hace la
  línea.
- Componentes funcionales con hooks. Nada de `any`.
- Textos de cara al usuario en español, sin emojis.
- Antes de dar por terminado un cambio: `npm run lint`.
