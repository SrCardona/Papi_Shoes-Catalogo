# PAPI SHOES — Contexto del proyecto

Catálogo de tenis con cotización por WhatsApp. No hay carrito ni pasarela de
pago: el objetivo de cada pantalla es llevar a un mensaje de WhatsApp bien
armado. Todo el texto de cara al usuario va en español de Colombia.

## Comandos

```bash
npm run dev       # servidor local
npm run build     # tsc --noEmit && vite build
npm run lint      # tsc --noEmit && eslint src
npm run catalogo -- --precio=180000 --antes=210000
```

## Stack

React 19 + TypeScript + Vite + Tailwind v4 (sin archivo de config: los tokens
están en `@theme` dentro de `src/index.css`) + react-router-dom. Iconos de
lucide-react. Sin backend: todo vive en el navegador.

## Dónde viven los datos (esto causa confusión, léelo bien)

El catálogo tiene dos fuentes y **el navegador le gana al código**:

1. `src/data/catalogoGenerado.ts` — lo genera el script desde las fotos. Es lo
   que ven los visitantes nuevos del sitio publicado.
2. `localStorage` del navegador — llaves `papi_shoes_inventory`,
   `papi_shoes_settings`, `papi_shoes_deliveries`. Si hay algo guardado ahí,
   tiene prioridad sobre el código. Se carga en `src/context/StoreContext.tsx`.

Si un cambio en los datos "no se ve", casi siempre es esto. Para volver al
catálogo del código: `localStorage.clear()` en la consola.

## Estructura

```
src/
├── pages/          HomePage, CatalogPage (+ OriginalsPage, SneakersPage),
│                   ProductPage, AboutPage (El Templo), FaqPage, AdminPage
├── components/
│   ├── layout/     Navbar, Footer, Layout
│   └── ui/         SneakerColumn, Colonnade, FilterRail, SmartImage,
│                   DeliveryWall, HighlightRail, SectionHeader, TempleMark
├── admin/          SneakerForm, QuickEditor, DeliveryManager, SettingsPanel
├── context/        StoreContext (estado global + persistencia)
├── hooks/          useCatalogFilters (todo el filtrado y orden)
├── lib/            security.ts (saneamiento), validation.ts, utils.ts
└── data/           initialData.ts, catalogoGenerado.ts (GENERADO, no editar)
```

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

Solo el guion bajo agrupa varias fotos en un par (`modelo_2.jpg`). Un `(1)` o
un `-2` quedan como pares distintos, porque los catálogos los usan para
colorways diferentes.

## Reglas de seguridad (no relajar)

- Toda imagen pasa por `sanitizeImageUrl`: solo `https://`, `data:image/...` y
  rutas propias del sitio (`/catalogo/...`). Nada de `javascript:` ni de
  protocolo relativo `//`.
- Todo texto de entrada pasa por `sanitizeText`.
- El PIN del panel se guarda como hash SHA-256 (sin sal), nunca en claro. El
  repositorio no distribuye ninguno: el hash entra por `VITE_ADMIN_PIN_HASH`
  (variable de entorno de Vercel) y, si falta, el panel lo pide en el primer
  ingreso y lo guarda en el `localStorage` de ese navegador. Nunca agregues un
  PIN ni su hash al código: este repositorio es público.
- Lo que se importe desde un respaldo pasa por `src/lib/validation.ts` antes de
  entrar al estado.

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
