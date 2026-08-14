# PAPI SHOES — El Templo de los Tenis

Catálogo y panel de gestión de sneakers. React 19 + TypeScript + Vite + Tailwind v4.

---

## Arrancar el proyecto

```bash
npm install
npm run dev      # http://localhost:3000
```

Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Compilación de producción en `dist/` |
| `npm run preview` | Sirve la compilación para revisarla antes de publicar |
| `npm run lint` | Revisa tipos y reglas de ESLint |

ESLint incluye `eslint-plugin-react-hooks`, que atrapa la clase de fallo más
común en React: efectos que devuelven un valor por accidente. Un
`useEffect(() => window.scrollTo(0, 0), [ruta])` sin llaves devuelve el
resultado de la llamada, React lo toma como función de limpieza e intenta
invocarlo al desmontar el componente. Corre `npm run lint` antes de publicar.

---

## ⚠️ Antes de publicar el sitio

### 1. Guardar los cambios en la nube

Sin esto el panel funciona igual, pero **cada cambio se queda en el navegador
donde lo hiciste**: no lo ven los visitantes ni tu otro equipo, y se pierde si
limpias el navegador. Es una configuración de una sola vez, en Vercel:

1. **El almacén.** *Storage › Create › Blob*, y conéctalo a este proyecto. Eso
   crea la variable `BLOB_READ_WRITE_TOKEN` sola: no la escribas a mano.
2. **El PIN del panel.** Abre `/admin`, entra a **Ajustes › Seguridad › Hash
   para Vercel**, escribe el PIN que quieras usar y copia el hash. En
   *Settings › Environment Variables*, crea `ADMIN_PIN_HASH` con ese valor.
3. **La firma de las sesiones.** Genera una cadena aleatoria y guárdala en
   `ADMIN_SESSION_SECRET`:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

Vuelve a desplegar. Entra al panel: en **Ajustes › Nube** debe decir
"Publicado", y el encabezado muestra el estado en cada pantalla.

Nunca pongas el PIN en texto plano en un archivo, un commit ni una variable:
solo el hash. Este repositorio es público y un PIN publicado es un PIN conocido.
Las tres variables viven en Vercel y ninguna se commitea. `ADMIN_PIN_HASH` y
`ADMIN_SESSION_SECRET` no llevan el prefijo `VITE_` a propósito: así se quedan
en el servidor y no entran al código que descarga el navegador.

Con esto configurado, el ingreso al panel lo valida el servidor y sirve desde
cualquier equipo. El usuario deja de pedirse: nunca fue un secreto, y lo que
protege el panel es el PIN.

### 2. Trabajar desde otro equipo

Clona el repositorio, `npm install`, y crea un `.env` con la dirección del sitio
publicado:

```
VITE_API_ORIGIN="https://tu-sitio.vercel.app"
```

`npm run dev` reenvía `/api` a ese dominio, así que el panel local trabaja con el
catálogo de verdad: lo que edites ahí lo ve el sitio publicado, y al revés. Para
no repetir el `.env` en cada equipo, escribe el dominio en
`ORIGEN_API_POR_DEFECTO`, arriba de `vite.config.ts`: es la dirección pública del
sitio, no un secreto, y puede quedar en el repositorio.

Sin `VITE_API_ORIGIN`, `npm run dev` arranca igual pero sin nube: trabaja contra
el catálogo del código y el almacenamiento de ese navegador.

### 3. Revisa el número de WhatsApp

En **Ajustes › Tienda y contacto**: ese número recibe todos los pedidos del
sitio.

---

## Cómo está organizado

```
api/                         Funciones de Vercel: lo único que escribe en la nube
├── estado.ts                Lee y guarda el catálogo publicado
├── sesion.ts                Valida el PIN y firma la sesión de escritura
├── imagen.ts                Guarda una foto y devuelve su dirección
└── _lib/                    Almacén, sesión, intentos, saneado del documento

src/
├── main.tsx                 Punto de entrada
├── App.tsx                  Rutas y proveedores de contexto
├── types.ts                 Modelo de datos
│
├── context/
│   ├── StoreContext.tsx     Inventario y ajustes (estado global + nube)
│   └── AuthContext.tsx      Sesión del panel
│
├── hooks/
│   └── useCatalogFilters.ts Filtrado y ordenamiento del catálogo
│
├── lib/
│   ├── nube.ts              Cliente de /api: publicar, traer, subir fotos
│   ├── security.ts          Hash del PIN, sesión, saneamiento de URLs
│   ├── validation.ts        Validación de respaldos importados
│   └── utils.ts             Precios, enlaces de WhatsApp, archivos
│
├── data/initialData.ts      Catálogo de ejemplo y ajustes de fábrica
│
├── scripts/
│   └── generar-catalogo.mjs Arma el catálogo desde public/catalogo/
│
├── components/
│   ├── layout/              Navbar, Footer, Layout
│   └── ui/                  Piezas reutilizables
│
├── pages/                   Una vista por ruta
└── admin/                   Módulos del panel
```

### Rutas

| Ruta | Vista |
|---|---|
| `/` | Portada |
| `/originales` | Línea Originales — con legit check |
| `/sneakers` | Línea Sneakers — uso diario (`/streetwear` redirige aquí) |
| `/catalogo` | Catálogo completo con filtros |
| `/producto/:id` | Ficha de producto |
| `/nosotros` | El Templo — historia, verificación y muro de entregas |
| `/nosotros#entregas` | Muro de entregas a clientes |
| `/preguntas` | Preguntas frecuentes |
| `/admin` | Panel de administración |

---

## Cargar el catálogo desde las fotos

Para catálogos de decenas de pares no conviene subir las fotos una por una
desde el panel: en base64 se comen el `localStorage` del navegador. La vía
buena es que las fotos viajen dentro del proyecto.

1. Copia las fotos en `public/catalogo/`, **una carpeta por marca**:

   ```
   public/catalogo/
     sneakers/adidas/adidas-samba-og.jpg
     sneakers/nike/mujer/nike-dunk-low-panda.jpg
     originales/jordan/air-jordan-1-high-og-unc-toe.jpg
   ```

   - carpeta con nombre de marca (`adidas`, `nike`, `jordan`, `yeezy`,
     `new-balance`, `puma`, `asics`, `travis-scott`, `off-white`,
     `louis-vuitton`) → esa marca
   - carpeta `originales` → línea Originales; cualquier otra → línea Sneakers
   - carpeta `mujer` u `hombre` → esa horma; sin carpeta → unisex
   - varias fotos del mismo par: mismo nombre + `_2`, `_3`…

   Cargar marca por marca es la idea: cada una es su propia carpeta, y agregar
   Nike no toca nada de lo que ya hay en Adidas.

   La carpeta `otras` es para las marcas con dos o tres referencias, que no dan
   para una sección propia: todas quedan bajo la marca **Otras** y comparten un
   solo filtro. El nombre del par sí dice de qué marca es (`Vans Old Skool
   Negro`), así que se encuentran buscando.
2. Agrega el precio del lote a `precios.csv`, en la raíz:

   ```csv
   archivo,precio,antes
   marca:Nike,180000,210000
   marca:Louis Vuitton,190000,230000
   ```

3. Corre el script:

   ```bash
   npm run catalogo
   ```

   El script recorre **todas** las marcas y reescribe el catálogo completo, así
   que las marcas ya cargadas se conservan mientras sus fotos sigan en
   `public/catalogo/` y su fila siga en `precios.csv`. Banderas: `--precio` y
   `--antes` son el respaldo de lo que no aparezca en el CSV, `--marca=Adidas`
   fuerza la marca si no usaste carpetas y `--linea=originales` fuerza la línea.

4. Corrige lo que quedó raro en `ajustes/<marca>.json` (nombre, colorway,
   horma, descripción, línea, por nombre de archivo sin extensión) y vuelve a
   correr el script. Hay un archivo por marca y se combinan todos, así que
   corregir Nike no toca las correcciones de Adidas.

El script escribe dos cosas:

| Archivo | Para qué |
|---|---|
| `src/data/catalogoGenerado.ts` | **Es el catálogo que ven tus clientes** en el sitio publicado. Se sube con el proyecto. |
| `catalogo-papishoes.json` | Para importar en **Panel › Ajustes › Restaurar respaldo** y ver el catálogo en tu propio navegador, que ya tiene datos guardados. |

Los dos hacen falta: tu navegador ya tiene un catálogo en `localStorage` y este
le gana al código, así que sin importar el JSON tú seguirías viendo el catálogo
viejo aunque el sitio publicado ya muestre el nuevo.

El script deduce nombre, marca y modelo del nombre del archivo, y deja el
informe en la terminal: qué pares quedaron sin precio, cuáles sin marca
detectada y cuáles podrían ser fotos del mismo par mal nombradas.

**Precios por par.** Si un lote no es todo al mismo precio, pon los que se
salgan en `precios.csv` con el nombre del archivo sin extensión
(`nike-dunk-low-panda,420000,480000`): esa fila le gana a la de su marca.

**Cada marca es una sección.** El muro de marcas de la portada se arma con las
marcas que de verdad hay en el catálogo y cada una enlaza a `/catalogo?marca=Adidas`,
que también sirve como enlace directo para compartir por WhatsApp o Instagram.

**Un par por foto.** Solo el guion bajo (`modelo_2.jpg`) agrupa varias fotos
en un mismo par. Un `(1)` o un `-2` quedan como pares distintos, porque en la
práctica los catálogos los usan para colorways diferentes: en el lote de Adidas,
`ADIDAS x Stan Smith`, `(1)` y `(2)` eran negro, azul y verde.

**Sobre la horma:** el script nunca la adivina por el color de la foto. En
sneakers, hombre/mujer es una decisión de curva de tallas, no algo visual: el
mismo modelo en 35–40 se vende como mujer y en 39–45 como hombre. Por eso todo
queda en `unisex` salvo que la carpeta o el nombre del archivo lo digan
(`wmns`, `women`, `mujer`), y se ajusta desde el panel.

Las rutas del tipo `/catalogo/…` las acepta `sanitizeImageUrl` como imágenes
del propio sitio: se exige ruta absoluta con extensión de imagen conocida, y se
rechaza `//otro-dominio/x.jpg` y cualquier `..`.

---

## Muro de entregas

Las fotos de entregas se publican en El Templo (`/nosotros#entregas`) y en un
bloque resumido de la portada. Se administran en **Panel › Entregas**.

La ubicación se guarda como **dato** (ciudad + barrio), no como texto quemado
dentro de la imagen. Eso permite filtrar por ciudad, contar cobertura y mantener
la tipografía de la marca igual en todas las tarjetas, aunque las fotos vengan
de cámaras distintas. Si una foto ya trae el rótulo encima, marca la casilla
*"La ubicación ya viene escrita dentro de la foto"* y el sitio deja de dibujar
el suyo para no repetir el dato; la ciudad se sigue usando para filtrar.

Cada foto se **recomprime** al subirla (borde mayor de 1400 px, JPEG al 72%),
porque el `localStorage` del navegador solo da unos 5 MB en total y una foto de
celular sin tratar se come ese espacio en pocas entregas.

**Privacidad:** publica solo barrio y ciudad, nunca la dirección, la
nomenclatura de la casa ni la placa de un carro. Si sale la cara del cliente,
pide permiso antes.

---

## Sistema de diseño

Los tokens viven en `src/index.css` dentro del bloque `@theme`. Cambia un valor
ahí y se propaga a todo el sitio.

| Token | Valor | Uso |
|---|---|---|
| `obsidian` | `#0D0D0D` | Fondo base |
| `basalt` | `#1A1A1A` | Tarjetas y superficies |
| `marble-navy` | `#0D1B2A` | Secciones profundas |
| `lapis` | `#1E3A8A` | Acento principal |
| `silver` | `#C0C0C0` | Metálico del logotipo |
| `marble` | `#F2F2F2` | Texto |

**Tipografía:** Anton para títulos (condensada, en versalitas), Montserrat para
todo lo demás. Se cargan desde Google Fonts en `index.html`.

**Utilidades propias:** `.text-engraved` (metálico grabado del logotipo),
`.architrave` (divisor de doble filete), `.stylobate` (línea de base del
catálogo), `.fluted` (estriado de columna), `.column-card` (tarjeta de producto),
`.sanctum-glow` (luz del encabezado).

---

## Dónde se guardan los datos

Hay tres capas, y en ese orden manda cada una:

1. **La nube** (`estado.json` en el Blob Store). Es la fuente compartida: lo que
   se publica desde el panel y lo que ven todos los visitantes y todos los
   equipos. Si está configurada, gana.
2. **El `localStorage` del navegador**. Copia local: es lo que se pinta mientras
   responde la nube, y con lo que se sigue trabajando si no hay conexión. Solo le
   gana a la nube cuando tiene una edición más reciente que lo publicado, y en
   ese caso el panel avisa que hay cambios sin publicar.
3. **El código** (`src/data/catalogoGenerado.ts`). El catálogo que sale de las
   fotos con `npm run catalogo`. Es el punto de partida y vuelve a mandar cuando
   se regenera: el documento de la nube guarda la huella del catálogo con el que
   se publicó, y si el código trae otra, el inventario del código gana (los
   ajustes y las entregas se siguen tomando de la nube).

Cómo se publica:

- Cada cambio del panel sube solo, segundo y medio después de que dejas de
  editar. En **Ajustes › Nube** están "Publicar ahora" y "Traer de la nube" para
  hacerlo a mano.
- Las fotos que subes desde el dispositivo se guardan aparte en el almacén y en
  el catálogo queda su dirección. Por eso dejaron de llenar el navegador: antes
  cada foto viajaba dentro del catálogo como texto en base64.
- Los demás dispositivos se ponen al día al volver a la pestaña, y como la
  respuesta se cachea quince segundos, un cambio tarda a lo sumo ese margen en
  verse. No hace falta recargar a mano. Lo que sí pide recarga es un cambio de
  **código**: eso viaja por `git push` y lo despliega Vercel.
- Si editaste desde dos equipos, el segundo en guardar recibe un aviso de
  conflicto en vez de pisar el trabajo del otro. Ahí decides: "Traer de la nube"
  o volver a hacer tu cambio encima.
- El usuario y el PIN **nunca** se publican: el documento de la nube lo puede
  leer cualquiera.

Sin nube configurada todo sigue como antes: los cambios existen solo en ese
navegador. En ese caso, **exporta un respaldo seguido** desde Ajustes ›
Respaldos y guarda el `.json` en un lugar seguro.

---

## Seguridad: qué protege y qué no

El sitio es estático, pero el panel sí tiene servidor: tres funciones en `api/`
que son las únicas que pueden escribir en la nube.

**Lo que sí hace:**

- El PIN se compara **en el servidor**, contra `ADMIN_PIN_HASH`. Ese hash no
  entra al bundle, así que nadie se lo puede descargar para probarlo por fuerza
  bruta sin conexión.
- Escribir exige un token firmado (HMAC con `ADMIN_SESSION_SECRET`) que caduca a
  las dos horas. El navegador solo guarda ese token; el PIN no se guarda.
- Cinco intentos fallidos bloquean quince minutos, y el contador vive en el
  servidor —por huella de IP, nunca la IP en claro—, así que no se salta llamando
  directo a la función. Cada fallo además cuesta tiempo de espera.
- Lo que llega a guardarse se valida y sanea de nuevo en el servidor, con los
  mismos validadores del panel: una petición armada a mano no puede meter una URL
  `javascript:`, texto con caracteres de control ni desviar el número de
  WhatsApp.
- El usuario y el hash del PIN se descartan al publicar: no viajan al documento
  que lee cualquier visitante.
- Las fotos se aceptan solo como mapa de bits (JPG, PNG, WEBP, AVIF, GIF). El SVG
  queda fuera a propósito: es un documento que puede traer scripts.
- El PIN se guarda como hash SHA-256, nunca en texto plano. Es hash, no cifrado:
  no hay forma de volver al PIN desde el valor guardado, pero tampoco lleva sal,
  así que conviene un PIN largo. Por eso el repositorio no distribuye ninguno.
- No existe ningún acceso maestro alterno.
- Los respaldos importados se validan campo por campo, y un archivo importado
  **no puede** cambiar tus credenciales.

**Lo que no puede hacer:**

- Sin las variables configuradas, el panel vuelve al control local: valida en el
  navegador y los cambios no salen de ese equipo. Sirve para que un visitante
  casual no entre, no para frenar a alguien con conocimientos técnicos.
- Un PIN es un PIN: si se lo prestas a alguien, ese alguien puede editar el
  catálogo del sitio. No hay usuarios separados ni permisos por persona.
- El documento publicado es público, como el catálogo que describe. No pongas
  ahí nada que no quieras que se lea.
- Quien tenga el token de escritura durante esas dos horas puede escribir. Salir
  del panel lo borra.

### Siguiente paso

Lo que hay alcanza para un catálogo que administra una persona. Si en algún
momento entran pedidos con datos de clientes, pagos o varias personas
editando:

1. **Supabase** o **Firebase** para base de datos y autenticación por persona,
   con historial de quién cambió qué.
2. El punto de reemplazo es el mismo de siempre: `src/lib/nube.ts` y
   `src/context/StoreContext.tsx`. El resto de la aplicación no se entera, porque
   todo el acceso a datos pasa por ahí.
3. Guardar un histórico del documento en vez de sobrescribirlo, para poder volver
   atrás sin depender de un respaldo manual.

---

## Publicar

Conecta el repositorio a **Vercel**; `vercel.json` ya trae las reglas para que
las rutas funcionen al recargar la página.

```
Comando de compilación:  npm run build
Carpeta de salida:       dist
```

Tiene que ser Vercel, o al menos algo que ejecute las funciones de `api/`: en un
alojamiento puramente estático el sitio se ve bien, pero el panel queda sin nube
y los cambios vuelven a quedarse en un solo navegador.

---

## Notas de mantenimiento

- Las fotos de ejemplo apuntan a Unsplash. Antes de lanzar, súbelas a tu propio
  almacenamiento: las URLs externas pueden dejar de funcionar sin aviso. El sitio
  ya muestra un marcador de posición si una imagen falla, pero eso es un plan B,
  no una solución.
- Para cambiar los textos de las preguntas frecuentes, edita `FAQ_ITEMS` en
  `src/pages/FaqPage.tsx`.
- Para cambiar los pilares de marca o el muro de marcas, edita `BRAND_PILLARS` y
  `BRAND_WALL` en `src/data/initialData.ts`.
