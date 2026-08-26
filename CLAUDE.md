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
```

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

## Estructura

```
api/                estado.ts (leer/guardar), sesion.ts (PIN + token),
│                   imagen.ts (fotos), _lib/ (almacén, sesión, intentos, saneado)
catalogo/           precios.csv, ajustes/<marca>.json, llegadas.json (generado),
│                   catalogo-papishoes.json (generado)
lotes/              zips de lotes sin desempacar — no se versiona
public/catalogo/    las fotos, <linea>/<marca>/[horma/]
src/
├── pages/          HomePage, CatalogPage (+ OriginalsPage, SneakersPage),
│                   ProductPage, AboutPage (El Templo), FaqPage, AdminPage
├── components/
│   ├── layout/     Navbar, Footer, Layout
│   └── ui/         SneakerColumn, Colonnade, FilterRail, SmartImage,
│                   DeliveryWall, HighlightRail, SectionHeader, TempleMark
├── admin/          SneakerForm, QuickEditor, DeliveryManager, SettingsPanel,
│                   NubeSync (estado de la nube y publicación manual)
├── context/        StoreContext (estado global + nube + localStorage)
├── hooks/          useCatalogFilters (todo el filtrado y orden)
├── lib/            nube.ts (cliente de /api), security.ts (saneamiento),
│                   validation.ts, catalogo.ts (huella y fusión), utils.ts
└── data/           initialData.ts, catalogoGenerado.ts (GENERADO, no editar)
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

## Cargar fotos al catálogo

Hay dos carpetas y conviene no confundirlas:

- **`public/catalogo/`** — las fotos que sirve el sitio, y solo eso. La ruta es
  parte de la URL de cada imagen (`/catalogo/...`), así que no se mueve.
- **`catalogo/`** — lo que se edita a mano para armar el catálogo: `precios.csv`,
  `ajustes/<marca>.json`, `llegadas.json` (cuándo entró cada par, generado) y
  `catalogo-papishoes.json` (el respaldo que se importa en el panel, generado).

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

1. **Recoger.** Mover a `_entrada/` cualquier foto suelta en `public/catalogo/`
   que no esté dentro de `<linea>/<marca>/`. El dueño las suele dejar en
   `public/catalogo/sneakers/`, y ahí el generador las publicaría como pares
   "Otras" con nombre de WhatsApp.
2. **Clasificar antes de preguntar nada: tres casos, no dos.** `npm run entrada`
   compara el SHA-256 de cada foto contra todo `public/catalogo/` y contra la
   propia bandeja. Ese hash solo separa el caso A de los otros dos; el resto se
   decide mirando la foto. No se agrega comparación perceptual sin permiso,
   porque un falso positivo descartaría un colorway parecido pero distinto.

   - **Caso A — archivo idéntico** (mismo SHA-256 que una foto ya publicada).
     Es la misma foto, ya está. **No se procesa**: se queda en `_entrada/`, se
     reporta contra qué choca y la borra el dueño.
   - **Caso B — foto distinta de un par que ya está en el catálogo.** **No se
     descarta**, que es el error viejo: entra como foto adicional del par, con
     sufijo de guion bajo (`nombre_2.jpg`, `_3.jpg`, el siguiente libre). Es el
     caso más común —otro ángulo, otra luz, en caja, puesto, la suela— y todas
     suman. Va en la **misma** carpeta que la original (misma línea, marca y
     horma): no se pregunta marca ni horma, ya las define el par. **No se agrega
     nada a `ajustes/<marca>.json`**, que el par ya está registrado. La portada
     es la foto sin sufijo y no se toca: si la nueva se ve mejor de portada, se
     **pregunta** antes de renumerar.
   - **Caso C — par que no existe.** Flujo normal: se pregunta marca, nombre y
     horma, y se crea.

   Para decidir entre B y C se mira la foto, se identifica modelo y colorway y
   se compara contra `src/data/catalogoGenerado.ts` y las carpetas de
   `public/catalogo/`. Cuando parezca el mismo par que uno existente, **se
   muestran los dos y se pregunta antes de agrupar**. Ante la duda van
   separados y se avisa: dos colorways del mismo modelo se parecen muchísimo
   —un Stan Smith de talón verde y otro de talón azul son dos pares, no dos
   fotos— y agrupar mal borra un producto del catálogo. Separar de más solo
   deja un par repetido, que se une después; agrupar de más pierde inventario.
3. **Preguntar foto por foto.** Mirar cada imagen y proponer marca, nombre,
   colorway y línea; si el nombre del archivo ya dice el modelo, usarlo de base.
   **La horma siempre se pregunta, nunca se deduce de la foto ni del color.** Si
   la silueta no se reconoce, se dice claro en vez de inventar el modelo. Se
   aceptan respuestas cortas ("adidas samba, unisex"). Si varias fotos son de la
   misma marca se agrupan y la marca se pregunta una sola vez; se ofrece
   responder en lote ("todas unisex"). Con más de 15 fotos se avisa y se ofrece
   el modo lote antes de empezar.
4. **Acomodar.** `public/catalogo/<linea>/<marca>/[horma/]nombre.jpg`. Línea
   `sneakers` por defecto; marca en minúsculas con guiones; subcarpeta de horma
   solo si no es unisex; nombre en minúsculas, con guiones, sin acentos,
   espacios ni paréntesis; `.jfif` y `.jpeg` se normalizan a `.jpg`. **Si el
   destino ya existe no se sobrescribe**: se avisa y se pregunta si es otro
   colorway. Solo el guion bajo (`_2`) agrupa fotos del mismo par.
5. **Registrar y generar.** Escribir nombre, colorway y descripción en
   `catalogo/ajustes/<marca>.json` sin pisar lo que ya está (crearlo si falta).
   Preguntar precio y precio anterior antes de correr; si la marca ya tiene fila
   en `precios.csv`, proponer esa y confirmar. Luego `npm run catalogo`.
6. **Informe.** Cuántos pares nuevos, cuáles quedaron sin colorway y cuáles con
   marca "Otras" para corregir, y confirmar que `_entrada/` quedó vacía.
7. **Cerrar.** Un commit con el resumen de lo agregado.

Después de generar se comprueba la agrupación: que cada par con varias fotos
sea **un** producto con todas sus fotos en `images`, que el total de productos no
haya crecido por las fotos adicionales y que toda ruta de imagen exista en disco.
Si un par quedó partido en dos por un error de nombre, se arregla y se dice qué
pasó.

Nunca: inventar la horma, sobrescribir una foto, agrupar dos colorways distintos
como un mismo par, procesar un archivo idéntico o editar
`src/data/catalogoGenerado.ts` a mano.

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
`lapis`, `lapis-lit`). Títulos en Anton (`font-display`), texto en Montserrat.
Bordes finos `border-white/8`, rejillas con `gap-px`, mayúsculas con
`tracking` amplio para los rótulos. Sin sombras difusas ni bordes redondeados
grandes: la estética es de placa grabada, no de tarjeta de app.

## Convenciones de código

- Comentarios en español y solo donde explican **por qué**, no qué hace la
  línea.
- Componentes funcionales con hooks. Nada de `any`.
- Textos de cara al usuario en español, sin emojis.
- Antes de dar por terminado un cambio: `npm run lint`.
