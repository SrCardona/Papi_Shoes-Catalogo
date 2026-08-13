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

**Configura el PIN en Vercel.** El repositorio no trae ningún PIN, ni en claro ni
con hash: este repositorio es público y un PIN publicado es un PIN conocido. El
hash entra por variable de entorno:

1. Abre `/admin` en tu equipo. Sin variable configurada, el panel te pide crear
   un PIN y lo guarda en ese navegador.
2. Ve a **Ajustes › Seguridad › Hash para Vercel**, escribe el PIN que quieres
   usar en el sitio publicado y copia el hash que aparece.
3. En Vercel: **Settings › Environment Variables**, crea
   `VITE_ADMIN_PIN_HASH` con ese valor. Vuelve a desplegar.

Nunca pongas el PIN en texto plano en un archivo, un commit o la variable: solo
el hash. El usuario es `papi.cardona` (se cambia en **Ajustes › Seguridad**) y no
es una credencial secreta: lo que protege el panel es el PIN.

Si no configuras la variable, cualquier visitante que abra `/admin` en el sitio
publicado verá la pantalla de creación de PIN y entrará al panel **en su propio
navegador**. No puede alterar lo que ven los demás —no hay servidor— pero es
confuso y conviene evitarlo.

Y el límite de fondo: como el sitio no tiene backend, este control frena a un
visitante casual, no a alguien con conocimientos técnicos. El hash viaja en el
bundle y un PIN de pocos dígitos se adivina por fuerza bruta fuera de línea.
Para seguridad real hace falta un backend (ver "Siguiente paso: backend").

Revisa también, en **Ajustes › Tienda y contacto**, que el número de WhatsApp sea
el correcto: ese número recibe todos los pedidos del sitio.

---

## Cómo está organizado

```
src/
├── main.tsx                 Punto de entrada
├── App.tsx                  Rutas y proveedores de contexto
├── types.ts                 Modelo de datos
│
├── context/
│   ├── StoreContext.tsx     Inventario y ajustes (estado global)
│   └── AuthContext.tsx      Sesión del panel
│
├── hooks/
│   └── useCatalogFilters.ts Filtrado y ordenamiento del catálogo
│
├── lib/
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

El catálogo y los ajustes viven en el `localStorage` del navegador. Esto tiene
consecuencias que conviene tener claras:

- Los cambios que hagas en el panel **solo existen en ese navegador y ese equipo**.
- Si limpias los datos del navegador, **se pierde el catálogo**.
- El límite es de unos 5 MB. Las fotos subidas desde el dispositivo se guardan
  como texto y lo llenan rápido; para catálogos grandes usa URLs de imagen.

**Exporta un respaldo seguido** desde Ajustes › Respaldos. Guarda el `.json` en
un lugar seguro.

---

## Seguridad: qué protege y qué no

Este proyecto no tiene servidor: todo corre en el navegador del visitante. Por
eso conviene ser explícito.

**Lo que sí hace:**

- El PIN se guarda como hash SHA-256, nunca en texto plano. Es hash, no cifrado:
  no hay forma de volver al PIN desde el valor guardado, pero tampoco lleva sal,
  así que un PIN de pocos dígitos se puede adivinar por fuerza bruta si alguien
  obtiene el hash. Por eso el repositorio no distribuye ninguno.
- El código no trae PIN de fábrica: se crea en el primer ingreso y vive solo en
  el navegador del dueño.
- No existe ningún acceso maestro alterno: solo tu usuario y tu PIN entran.
- La sesión es un token con caducidad de 2 horas, no una bandera booleana.
- El acceso se bloquea 15 minutos tras 5 intentos fallidos.
- Los respaldos importados se validan campo por campo, y un archivo importado
  **no puede** cambiar tus credenciales ni tu número de WhatsApp arbitrariamente.
- Las URLs de imagen se filtran: solo pasan `https://` y `data:image/`.

**Lo que no puede hacer:** frenar a alguien con conocimientos técnicos. Cualquier
validación que ocurra en el navegador se puede saltar leyendo el código de la
página. Para el caso de uso actual —un catálogo público donde el panel solo edita
contenido de vitrina— es un riesgo aceptable: lo peor que puede pasar es que
alguien modifique el catálogo *en su propio navegador*, sin afectar a los demás
visitantes.

### Siguiente paso: backend

Si en algún momento vas a manejar pedidos con datos de clientes, pagos o
inventario compartido entre varias personas, necesitas un servidor. La ruta más
corta desde aquí:

1. **Supabase** o **Firebase** para base de datos y autenticación. Ambos tienen
   plan gratuito suficiente para empezar.
2. Reemplazar `localStorage` en `src/context/StoreContext.tsx` por llamadas a la
   base de datos. El resto de la aplicación no se entera, porque todo el acceso
   a datos pasa por ese archivo.
3. Mover la validación del login a políticas del lado del servidor (RLS en
   Supabase) para que el control deje de depender del navegador.
4. Subir las imágenes a almacenamiento de objetos (Supabase Storage, Cloudflare
   R2) en vez de guardarlas dentro del navegador.

---

## Publicar

La compilación es un sitio estático. En Vercel o Netlify basta con conectar el
repositorio; los archivos `vercel.json` y `public/_redirects` ya están incluidos
para que las rutas funcionen al recargar la página.

```
Comando de compilación:  npm run build
Carpeta de salida:       dist
```

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
