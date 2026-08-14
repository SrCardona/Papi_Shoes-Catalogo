# PAPI SHOES — Contexto del proyecto

Catálogo de tenis con cotización por WhatsApp. No hay carrito ni pasarela de
pago: el objetivo de cada pantalla es llevar a un mensaje de WhatsApp bien
armado. Todo el texto de cara al usuario va en español de Colombia.

## Comandos

```bash
npm run dev       # servidor local
npm run build     # tsc --noEmit && vite build
npm run lint      # tsc --noEmit && eslint src
npm run catalogo    # precios por marca en precios.csv
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
   Punto de partida, y vuelve a mandar al regenerarse: el documento de la nube
   guarda la huella del catálogo con el que se publicó y, si el código trae otra,
   el inventario del código gana. Los ajustes y las entregas se siguen tomando de
   la nube.

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
│                   validation.ts, utils.ts
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

Las fotos van en `public/catalogo/<linea>/<marca>/[horma/]archivo.jpg`, una
carpeta por marca. `npm run catalogo` recorre todo, deduce nombre y marca, y
escribe `src/data/catalogoGenerado.ts` + `catalogo-papishoes.json`. Las
correcciones manuales (nombre, colorway, horma, descripción) van en
`ajustes/<marca>.json`, por nombre de archivo sin extensión.

Una marca con pocas referencias va en la carpeta `otras`: todas quedan bajo la
marca `Otras` y comparten un filtro, con la marca real en el nombre del par.
Solo se abre carpeta propia cuando la marca aguanta su propia sección.

El precio va en `precios.csv`, una fila `marca:<Marca>,precio,antes` por lote.
Cada marca conserva el suyo cuando entra la siguiente, así que no uses
`--precio` para un lote nuevo: pisaría el de todas las demás.

Solo el guion bajo agrupa varias fotos en un par (`modelo_2.jpg`). Un `(1)` o
un `-2` quedan como pares distintos, porque los catálogos los usan para
colorways diferentes.

## Reglas de seguridad (no relajar)

- Toda imagen pasa por `sanitizeImageUrl`: solo `https://`, `data:image/...` y
  rutas propias del sitio (`/catalogo/...`). Nada de `javascript:` ni de
  protocolo relativo `//`.
- Todo texto de entrada pasa por `sanitizeText`.
- El PIN del panel se guarda como hash SHA-256 (sin sal), nunca en claro. El
  repositorio no distribuye ninguno: el hash del sitio publicado entra por
  `ADMIN_PIN_HASH` (variable de entorno de Vercel, sin prefijo `VITE_` para que
  no llegue al navegador). Si falta, el panel cae al modo local y lo pide en el
  primer ingreso. Nunca agregues un PIN ni su hash al código: este repositorio es
  público.
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
