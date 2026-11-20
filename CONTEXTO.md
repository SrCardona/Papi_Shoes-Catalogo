# CONTEXTO — para retomar el trabajo en otra sesión o en otro equipo

Este archivo complementa a `CLAUDE.md`. CLAUDE.md dice **cómo funciona el
proyecto y qué reglas no se rompen**; este dice **cómo se trabaja con el dueño,
en qué estado quedó todo y qué falta**. Una sesión nueva debe leer los dos antes
de tocar nada. Última actualización: 20 de noviembre de 2026.

El repositorio es **público**: aquí no va ningún PIN, token, llave, correo ni
precio de costo del proveedor.

---

## 1. Arrancar en un equipo nuevo

```bash
git clone https://github.com/SrCardona/Papi_Shoes-Catalogo.git
cd Papi_Shoes-Catalogo
git switch rediseno-v2        # la rama de trabajo
npm install
npm run lint                  # tsc + eslint
npm run build                 # compila y escribe las 1.305 fichas + sitemap
```

- `npm run dev` **edita los datos de producción** (reenvía `/api` al sitio
  publicado). Para revisar cambios sin riesgo se usa la compilación:
  `npx vite preview --port 4173` después de `npm run build`.
  `.claude/launch.json` ya trae esa configuración ("vista-previa").
- **Fotos (solo si se van a cargar pares):** venv de Python en `tools/.venv`
  con rembg (ver "Entorno para recortar" en CLAUDE.md). El modelo
  `birefnet-general` (~900 MB) se descarga solo la primera vez.
- **Capturas automáticas (opcional):** se han hecho con Playwright desde una
  carpeta temporal (`npm i playwright` ahí y `npx playwright install chromium
  webkit`). No va en el `package.json` del proyecto.
- **Variables de entorno:** viven solo en Vercel, nunca en el repositorio:
  `ADMIN_PIN_HASH`, `ADMIN_SESSION_SECRET`, `ADMIN_USUARIO` y el token del
  almacén (Vercel Blob). Si en otro equipo hace falta alguna en local, va en
  `.env.local` (ignorado por git) y la pone el dueño, no se pega en el chat.

---

## 2. Cómo trabaja el dueño (preferencias acordadas)

- Todo en **español de Colombia**, explicado sin jerga. Él revisa desde el
  celular (iPhone, Safari) y muchas veces manda capturas.
- **Cambios de diseño o de interfaz:** se hacen en local y se le **muestran
  primero** (capturas de escritorio y celular, y la vista previa abierta en el
  navegador del panel). **No se sube nada hasta que diga "visto bueno"**.
- **Publicar, una vez aprobado:** directo, sin pull request:
  `git push origin rediseno-v2` → `git switch main` → `git merge rediseno-v2`
  → `git push origin main` → volver a `rediseno-v2`. Vercel despliega desde
  `main`. Para confirmar el despliegue se compara el nombre del archivo
  `assets/index-*.js` de `dist/` con el que sirve https://www.papishoes.shop.
  Si Vercel no toma el push (pasó una vez: el commit quedó sin estado en
  GitHub), se dispara de nuevo con un commit vacío.
- Cada commit lleva un resumen en español de qué cambió y por qué.
- **Precios nunca redondos:** terminan en 9.900 o 9.000 (189.900, 164.900).
  La línea Originales todavía tiene cifras redondas (380.000, 450.000…): no se
  cambian sin preguntarle.
- **Nunca publicar desde el panel** (`/admin`), ni siquiera para probar.
- Cuando algo es una decisión suya (modelos, tallas, horma, línea, unir pares
  repetidos), se le muestran las fotos lado a lado y se pregunta. No se
  inventan modelos: si no hay certeza, quedan "por identificar".

---

## 3. Estado actual (20-nov-2026)

- Sitio: **https://www.papishoes.shop** — `main` y `rediseno-v2` iguales y
  subidos. Ramas viejas: `archivo/rediseno-zellerfeld` (rediseño descartado,
  se conserva) y `navidad` (local, ya fusionada).
- Catálogo: **1.305 pares** — 88 Originales y 1.217 Sneakers. El lote de
  Telegram de noviembre agregó unos 650 pares a la
  línea Sneakers.
- **Campañas activas, se apagan solas** (`src/lib/temporada.ts`):
  - **Navidad**, del 1-nov al 3-ene: nieve, luces, gorro en todos los templos,
    árboles (uno detrás de los contadores en el celular), moño, borde de nieve
    en las tarjetas, "Regalo ideal" en los pares de mayor descuento.
  - **Black Friday**, del 15-nov al 30-nov a las 11:59 p. m.: toda la línea
    Sneakers a **$164.900** (bloque con cuenta regresiva en la portada, franja
    en Sneakers y Catálogo, rótulo en las tarjetas y la ficha, precio en el
    mensaje de WhatsApp). Originales no entran.
  - **Después del 1 de diciembre conviene un despliegue** (cualquier carga de
    fotos sirve): las fichas estáticas que ve WhatsApp dicen "Black Friday en
    la página hasta el 30 de noviembre" y solo se reescriben al compilar.
- Cosas grandes hechas este mes, por si alguien pregunta "¿por qué está así?":
  - El catálogo generado va en **bloques de 300 pares** (`BLOQUE_n`) porque un
    solo arreglo de 1.193+ pares rompía TypeScript (TS2590).
  - El catálogo del sitio se monta **por tandas de 24** y la búsqueda usa
    `useDeferredValue`: antes buscar en el celular congelaba 4 segundos.
  - `SmartImage` sobrevive al optimizador de Vercel caído (ver pendiente 1).
  - Los **pares fantasma** (renombrados o retirados del código que seguían en el
    navegador de quien ya había entrado, con "Sin imagen") se limpian solos:
    `creadoEnPanel()` / `sinFantasmas()` en `src/lib/catalogo.ts`.
  - El anuncio emergente solo abre si su foto carga (antes salía un cuadro
    vacío con la X).
  - Lupa de búsqueda en el celular, cinta de anuncio en movimiento, chips de
    marca en "En el altar".

---

## 4. Pendientes, en orden de importancia

1. **Fotos lentas: el optimizador de imágenes de Vercel responde 402** (cuota
   agotada). El sitio cae al archivo original (~156 KB por foto en vez de
   ~20 KB) y en el celular las tarjetas tardan. Plan acordado en principio:
   **migrar las fotos a Cloudinary**. El dueño iba a crear la cuenta y pasar
   solo el *cloud name* (es público). Las llaves de la API las pone él en
   `.env.local` y en Vercel. Plan: script que sube `public/catalogo/` con la
   misma ruta como nombre, `SmartImage` pide `f_auto,q_auto,w_N` a Cloudinary
   con respaldo al archivo local, `npm run subir-fotos` dentro del flujo de
   fotos, e imagen de WhatsApp de 1200×630. Mostrar en local antes de publicar.
2. **66 fotos de Telegram por identificar:** en
   `pendientes/telegram-por-identificar/` con su `LEEME.md` (grupos: On, Under
   Armour, Adidas, Nike y otros). Esperan a que el dueño diga los modelos.
   Recordárselo una vez al empezar una sesión.
3. **Hallazgos de la revisión del sitio que el dueño no ha aprobado todavía:**
   - El pie dice "Garantía de calidad y autenticidad verificada en cada
     entrega" en todas las páginas, también en Sneakers (choca con la regla de
     la línea). Está en `guaranteeText` de `src/data/initialData.ts`. Propuesta:
     "Garantía de calidad en cada entrega. Originales con legit check
     documentado."
   - 66 pares de agosto sin `colorway` (el mensaje de WhatsApp sale sin color).
   - Las páginas de catálogo no tienen `h1`; en el celular los enlaces del pie,
     las migas y el botón de compartir miden menos de 44 px.
   - Fotos con códigos de proveedor visibles ("3637H", "136-2"…) y una con el
     ícono de otra tienda (el Chuck 70 de lona).
   - Una dirección inexistente responde 200 en vez de 404; la CSP está solo
     en modo de reporte.
4. **El iPhone del dueño** tiene guardados cambios viejos del panel que nunca se
   publicaron (unos 36 pares ocultos y ajustes de septiembre). Por eso ahí ve
   1194 Sneakers en vez de 1217. Decidió descartarlos: tiene que borrar los
   datos de papishoes.shop en Ajustes › Apps › Safari › Avanzado › Datos de
   sitios web. No es un fallo del código.

---

## 5. Cómo se cargó el lote grande (por si llega otro)

El procedimiento oficial es el de CLAUDE.md y la skill `/fotos`. Para un lote de
más de mil fotos se hizo así, con scripts que quedaron en `lotes/` (no se
versiona, así que en otro equipo hay que rehacerlos si hacen falta):

- Las fotos se bajaron del canal de Telegram desde el navegador del dueño.
- Se quitaron repetidas dentro del lote y contra el catálogo con un hash
  perceptual (dHash 16×16 más histograma de color), siempre revisando a ojo
  antes de descartar.
- Se procesó **por tandas de 100**: recorte (`scripts/recortar-entrada.py`,
  un solo proceso a la vez), ubicación y ajustes con un script propio que nunca
  sobrescribe, `npm run catalogo`, verificación (sin pares perdidos, sin
  referencias ni ids repetidos, sin precio 0, toda ruta de foto existe), lint,
  marcas, build, commit y publicación de cada tanda.
- Decisiones del dueño para ese lote: todo a la línea **Sneakers**; horma por el
  rango de tallas del proveedor (36-39 mujer, 40-44 hombre, 36-44 unisex; el
  mismo par en dos rangos es un solo par unisex); se descartan fotos con logos
  o cajas de otras marcas, marcas de agua de otras tiendas, caras, niños o
  menos de 600 px; los códigos de proveedor se borran si se puede y si no, la
  foto entra igual.
