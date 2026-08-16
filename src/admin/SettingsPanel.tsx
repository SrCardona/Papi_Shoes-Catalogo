import { useRef, useState } from 'react';
import {
  Camera,
  Download,
  ImagePlus,
  KeyRound,
  Loader2,
  Megaphone,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { PopupAnnouncement, StoreSettings, StorySlide } from '../types';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import {
  validateDeliveries,
  validateSettings,
  validateSneakers,
} from '../lib/validation';
import {
  sanitizeImageUrl,
  sanitizeLinkUrl,
  sanitizeText,
  sha256,
} from '../lib/security';
import { NubePanel } from './NubeSync';
import { SmartImage } from '../components/ui/SmartImage';
import { compressImageFile, cx, formatPhoneDisplay } from '../lib/utils';

const field =
  'w-full bg-obsidian border border-white/12 py-2.5 px-3 text-[12.5px] text-marble placeholder:text-marble/25 focus:outline-none focus:border-silver/50 transition-colors';

const label =
  'block text-[9px] font-semibold uppercase tracking-[0.2em] text-marble/40 mb-2';

type Notice = { tone: 'ok' | 'error'; text: string } | null;

/** Un id nuevo cada vez: es lo que hace que el anuncio vuelva a mostrarse. */
const nuevoIdAnuncio = () => `anuncio-${Date.now().toString(36)}`;

/**
 * Editor del flyer de bienvenida.
 *
 * El id es la pieza que cuesta explicar y la que más importa: quien cierra el
 * anuncio no lo vuelve a ver, y esa decisión queda guardada contra el id. Por
 * eso cambiar la imagen genera un id nuevo automáticamente —un flyer distinto
 * es un anuncio distinto y tiene que llegarle también a quien ya cerró el
 * anterior— y además queda el botón para volver a mostrar el mismo.
 */
function PopupAnnouncementEditor({
  value,
  onChange,
}: {
  value: PopupAnnouncement;
  onChange: (next: PopupAnnouncement) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlImagen, setUrlImagen] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ponerImagen = (image: string) =>
    onChange({ ...value, image, id: nuevoIdAnuncio() });

  const subirArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    setError(null);
    try {
      ponerImagen(await compressImageFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la imagen.');
    } finally {
      setSubiendo(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const pegarUrl = () => {
    if (!urlImagen.trim()) return;
    const limpia = sanitizeImageUrl(urlImagen);
    if (limpia.startsWith('data:image/svg')) {
      setError('Esa dirección no sirve. Debe empezar por https:// o ser una ruta del sitio, como /anuncios/flyer.jpg');
      return;
    }
    setError(null);
    ponerImagen(limpia);
    setUrlImagen('');
  };

  const enlaceLimpio = sanitizeLinkUrl(value.link);
  const enlaceRoto = Boolean(value.link) && !enlaceLimpio;

  return (
    <div className="bg-basalt border border-white/10 p-5 space-y-5">
      <label className="flex items-center gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
          className="w-4 h-4 accent-lapis"
        />
        <span className="text-[12px] text-marble/70">
          Mostrar el anuncio al entrar a la portada
        </span>
      </label>

      {!value.image && (
        <p className="text-[11px] text-marble/35 leading-relaxed">
          Sin imagen el anuncio no se muestra, aunque esté prendido.
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-5">
        <div className="space-y-2.5">
          <span className={label}>Imagen del flyer</span>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={subiendo}
            className="flex items-center justify-center gap-2 w-full py-3 border border-white/14 text-marble/65 hover:text-marble hover:border-silver/45 text-[10px] font-semibold uppercase tracking-[0.18em] disabled:opacity-50 transition-colors"
          >
            {subiendo ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {subiendo ? 'Procesando…' : 'Subir flyer'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={subirArchivo}
            className="hidden"
          />

          <div className="flex gap-2">
            <input
              value={urlImagen}
              onChange={(e) => setUrlImagen(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  pegarUrl();
                }
              }}
              placeholder="o pegar /anuncios/flyer.jpg"
              className={field}
            />
            <button
              type="button"
              onClick={pegarUrl}
              className="px-4 border border-white/14 text-marble/65 hover:text-marble hover:border-silver/45 transition-colors"
              aria-label="Usar esta dirección"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10.5px] text-marble/30 leading-relaxed">
            Vertical, formato historia (9:16). Lo mejor es dejarla en{' '}
            <code className="text-silver">public/anuncios/</code> y poner aquí su
            ruta: así no ocupa espacio del navegador.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className={label} htmlFor="a-link">Enlace al tocar (opcional)</label>
            <input
              id="a-link"
              value={value.link ?? ''}
              onChange={(e) => onChange({ ...value, link: e.target.value })}
              placeholder="https://wa.me/… o /catalogo"
              className={field}
            />
            {enlaceRoto && (
              <p className="text-[10.5px] text-red-300/80 mt-1.5">
                No se va a guardar: debe empezar por https:// o por /.
              </p>
            )}
          </div>

          <div>
            <label className={label} htmlFor="a-alt">Qué dice el flyer</label>
            <textarea
              id="a-alt"
              rows={3}
              value={value.alt}
              onChange={(e) => onChange({ ...value, alt: e.target.value })}
              placeholder="Chiva rumbera, 5 de septiembre, cover 40K…"
              className={cx(field, 'resize-y')}
            />
            <p className="text-[10.5px] text-marble/30 mt-1.5 leading-relaxed">
              Para quien no puede ver la imagen, y para cuando la foto no carga.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/8">
        <p className="text-[10.5px] text-marble/30 leading-relaxed max-w-md">
          Quien cierra el anuncio no lo vuelve a ver. Al cambiar la imagen se
          renueva solo; usa el botón si quieres volver a mostrar el mismo flyer.
          <br />
          <span className="text-marble/45">Id actual: </span>
          <code className="text-silver">{value.id || '—'}</code>
        </p>
        <button
          type="button"
          onClick={() => onChange({ ...value, id: nuevoIdAnuncio() })}
          className="flex items-center gap-2 px-4 py-2.5 border border-white/14 text-marble/65 hover:text-marble hover:border-silver/45 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Mostrar de nuevo a todos
        </button>
      </div>

      {error && <p className="text-[11px] text-red-300/80">{error}</p>}

      {value.image && (
        <div>
          <span className={label}>Vista previa</span>
          {/* El mismo fondo y el mismo encuadre del anuncio real, en pequeño. */}
          <div className="relative bg-obsidian/92 border border-white/10 flex items-center justify-center p-6">
            <div className="relative">
              <SmartImage
                src={value.image}
                alt={value.alt || 'Vista previa del anuncio'}
                className="max-h-72 w-auto object-contain border border-white/10"
              />
              <span
                aria-hidden
                className="absolute -top-3 -right-3 w-11 h-11 flex items-center justify-center bg-obsidian border border-silver/40 text-marble"
              >
                <X className="w-5 h-5" />
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Editor de las diapositivas de una historia (Envíos, Promos o Reseñas).
 *
 * La foto entra por archivo o por URL, igual que en Entregas: por archivo se
 * recomprime, porque una foto de celular sin tratar llena el almacenamiento
 * del navegador en pocas subidas; por URL pasa por `sanitizeImageUrl`, que
 * solo deja `https://` y rutas del propio sitio.
 */
function StorySlidesEditor({
  title,
  hint,
  slides,
  onChange,
}: {
  title: string;
  hint: string;
  slides: StorySlide[];
  onChange: (slides: StorySlide[]) => void;
}) {
  const [image, setImage] = useState('');
  const [slideTitle, setSlideTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      setImage(await compressImageFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la foto.');
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const addUrlPhoto = () => {
    if (!imageUrl.trim()) return;
    const clean = sanitizeImageUrl(imageUrl);
    if (clean.startsWith('data:image/svg')) {
      setError('Esa URL no sirve. Debe empezar por https://');
      return;
    }
    setImage(clean);
    setImageUrl('');
    setError(null);
  };

  const add = () => {
    if (!image) {
      setError('Falta la foto de la historia.');
      return;
    }
    const texto = sanitizeText(caption, 240);
    if (!texto) {
      setError('El texto es obligatorio: es lo que se lee sobre la foto.');
      return;
    }
    onChange([
      ...slides,
      {
        image,
        caption: texto,
        title: sanitizeText(slideTitle, 80) || undefined,
      },
    ]);
    setImage('');
    setSlideTitle('');
    setCaption('');
    setError(null);
  };

  return (
    <div className="bg-basalt border border-white/10 p-5 space-y-5">
      <div className="pb-3 border-b border-white/8">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-marble">
          {title}
        </h3>
        <p className="text-[11px] text-marble/35 mt-1.5 leading-relaxed">{hint}</p>
      </div>

      {slides.length > 0 ? (
        <ul className="space-y-2">
          {slides.map((slide, i) => (
            <li
              key={`${slide.image}-${i}`}
              className="flex items-center gap-3 bg-obsidian border border-white/8 p-2.5"
            >
              <SmartImage
                src={slide.image}
                alt=""
                className="w-12 h-12 object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                {slide.title && (
                  <p className="text-[11px] font-semibold text-marble truncate">
                    {slide.title}
                  </p>
                )}
                <p className="text-[11px] text-marble/45 line-clamp-2 leading-snug">
                  {slide.caption}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onChange(slides.filter((_, index) => index !== i))}
                aria-label={`Eliminar diapositiva ${i + 1}`}
                className="p-2 text-marble/35 hover:text-red-300 transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11.5px] text-marble/30 leading-relaxed">
          Todavía no hay fotos tuyas. Mientras tanto, la historia muestra la
          diapositiva de ejemplo que trae el sitio.
        </p>
      )}

      {error && (
        <p role="alert" className="text-[11.5px] text-red-300">
          {error}
        </p>
      )}

      <div className="space-y-3 pt-1">
        {image && (
          <div className="flex items-center gap-3">
            <SmartImage src={image} alt="" className="w-16 h-16 object-cover" />
            <button
              type="button"
              onClick={() => setImage('')}
              className="text-[10px] font-semibold uppercase tracking-[0.18em] text-marble/45 hover:text-marble transition-colors"
            >
              Quitar foto
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-3.5 py-2.5 border border-white/12 text-[10px] font-semibold uppercase tracking-[0.16em] text-marble/65 hover:text-marble hover:border-silver/40 transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ImagePlus className="w-3.5 h-3.5" />
            )}
            Subir foto
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={uploadPhoto}
            className="hidden"
          />

          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addUrlPhoto();
              }
            }}
            placeholder="…o pega una URL https://"
            aria-label="URL de la foto"
            className={cx(field, 'flex-1 min-w-[12rem]')}
          />
        </div>

        <input
          value={slideTitle}
          onChange={(e) => setSlideTitle(e.target.value)}
          placeholder="Título (opcional)"
          aria-label="Título de la diapositiva"
          className={field}
        />

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Texto que se lee sobre la foto"
          aria-label="Texto de la diapositiva"
          rows={2}
          className={cx(field, 'resize-none')}
        />

        <button
          type="button"
          onClick={add}
          className="flex items-center gap-2 px-4 py-2.5 bg-marble text-obsidian text-[10px] font-bold uppercase tracking-[0.18em] hover:bg-silver transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar diapositiva
        </button>
      </div>
    </div>
  );
}

export function SettingsPanel({
  onGoToDeliveries,
}: {
  /** Lleva a la pestaña de Entregas, que es donde viven las de Clientes. */
  onGoToDeliveries?: () => void;
}) {
  const {
    settings,
    setSettings,
    setSneakers,
    sneakers,
    deliveries,
    setDeliveries,
    resetCatalog,
  } = useStore();
  const { changePin, validaEnServidor } = useAuth();

  const [draft, setDraft] = useState<StoreSettings>(settings);
  const [notice, setNotice] = useState<Notice>(null);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinNotice, setPinNotice] = useState<Notice>(null);
  const [hashSource, setHashSource] = useState('');
  const [hashResult, setHashResult] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const hashSeq = useRef(0);

  /* El hash se calcula mientras se escribe. `sha256` es asíncrono, así que se
     numera cada pulsación y se descarta el resultado que llegue tarde. */
  const updateHashSource = async (value: string) => {
    setHashSource(value);
    const seq = ++hashSeq.current;
    const clean = value.trim();
    if (!clean) {
      setHashResult('');
      return;
    }
    try {
      const digest = await sha256(clean);
      if (seq === hashSeq.current) setHashResult(digest);
    } catch {
      // Sin contexto seguro (http por IP de red) el navegador no da crypto.
      if (seq === hashSeq.current) setHashResult('');
    }
  };

  const flash = (n: Notice) => {
    setNotice(n);
    setTimeout(() => setNotice(null), 4000);
  };

  /**
   * Las historias se guardan al momento, como las entregas: no esperan al
   * botón "Guardar ajustes". El borrador local se sincroniza a la vez, porque
   * si no, guardar el formulario después devolvería la lista anterior.
   */
  const saveSlides = (
    key: 'shippingSlides' | 'promoSlides' | 'reviewSlides',
    slides: StorySlide[],
  ) => {
    setSettings({ ...settings, [key]: slides });
    setDraft((prev) => ({ ...prev, [key]: slides }));
  };

  /* Igual que las historias: se guarda al momento y no al pulsar "Guardar".
     Subir un flyer y salir del panel no puede perderlo. */
  const saveAnnouncement = (popupAnnouncement: PopupAnnouncement) => {
    setSettings({ ...settings, popupAnnouncement });
    setDraft((prev) => ({ ...prev, popupAnnouncement }));
  };

  const saveSettings = () => {
    const phone = draft.whatsappNumber.replace(/\D/g, '');
    if (!/^\d{10,15}$/.test(phone)) {
      flash({ tone: 'error', text: 'El número de WhatsApp debe tener entre 10 y 15 dígitos, con indicativo y sin el signo +.' });
      return;
    }
    setSettings({ ...draft, whatsappNumber: phone });
    flash({ tone: 'ok', text: 'Ajustes guardados.' });
  };

  const submitPinChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await changePin(currentPin, newPin);
    setPinNotice({
      tone: result.ok ? 'ok' : 'error',
      text: result.message ?? (result.ok ? 'PIN actualizado.' : 'No se pudo cambiar el PIN.'),
    });
    if (result.ok) {
      setCurrentPin('');
      setNewPin('');
    }
  };

  const exportBackup = () => {
    const payload = JSON.stringify(
      {
        version: 3,
        exportedAt: new Date().toISOString(),
        sneakers,
        deliveries,
        settings,
      },
      null,
      2,
    );
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `papi-shoes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);

        // Todo pasa por el validador antes de tocar la aplicación.
        const importedSneakers = validateSneakers(parsed.sneakers);
        if (!importedSneakers.length) {
          flash({ tone: 'error', text: 'El archivo no contiene pares válidos.' });
          return;
        }

        const importedSettings = validateSettings(parsed.settings, settings);
        // Los respaldos versión 2 no traen entregas: en ese caso se conservan
        // las que ya están en el navegador en vez de borrar el muro.
        const importedDeliveries = validateDeliveries(parsed.deliveries);

        setSneakers(importedSneakers);
        setSettings(importedSettings);
        setDraft(importedSettings);
        if (importedDeliveries.length) setDeliveries(importedDeliveries);

        flash({
          tone: 'ok',
          text: `Se restauraron ${importedSneakers.length} pares y ${importedDeliveries.length} entregas. Tu usuario y PIN no cambiaron.`,
        });
      } catch {
        flash({
          tone: 'error',
          text: `El archivo no es un respaldo válido de ${settings.storeName}.`,
        });
      } finally {
        if (importRef.current) importRef.current.value = '';
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div className="space-y-12 max-w-3xl">
      {notice && (
        <p
          role="status"
          className={cx(
            'px-4 py-3 text-[12px] border',
            notice.tone === 'ok'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
              : 'bg-red-950/40 border-red-500/30 text-red-300',
          )}
        >
          {notice.text}
        </p>
      )}

      {/* Tienda */}
      <section className="space-y-5">
        <div className="pb-4 border-b border-white/10">
          <h2 className="font-display text-2xl text-marble">Tienda y contacto</h2>
          <p className="text-[12px] text-marble/40 mt-1">
            El número de aquí es el que reciben todos los botones de WhatsApp del sitio.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={label} htmlFor="s-name">Nombre de la tienda</label>
            <input
              id="s-name"
              value={draft.storeName}
              onChange={(e) => setDraft({ ...draft, storeName: e.target.value })}
              className={field}
            />
            <p className="text-[10.5px] text-marble/30 mt-1.5">
              Sale en la barra, la portada, el pie y el título de la pestaña.
            </p>
          </div>

          <div>
            <label className={label} htmlFor="s-tagline">Bajada de la marca</label>
            <input
              id="s-tagline"
              value={draft.tagline}
              onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
              placeholder="EL TEMPLO DE LOS TENIS"
              className={field}
            />
            <p className="text-[10.5px] text-marble/30 mt-1.5">
              Debajo del nombre. Si lo dejas vacío, no se dibuja.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className={label} htmlFor="s-slogan">Eslogan</label>
            <input
              id="s-slogan"
              value={draft.slogan}
              onChange={(e) => setDraft({ ...draft, slogan: e.target.value })}
              className={field}
            />
            <p className="text-[10.5px] text-marble/30 mt-1.5">
              Encima del titular de la portada y en el pie.
            </p>
          </div>

          <div>
            <label className={label} htmlFor="s-phone">WhatsApp (indicativo, sin +)</label>
            <input
              id="s-phone"
              value={draft.whatsappNumber}
              onChange={(e) => setDraft({ ...draft, whatsappNumber: e.target.value })}
              placeholder="573045961031"
              className={cx(field, 'font-mono')}
            />
            <p className="text-[10.5px] text-marble/30 mt-1.5">
              Se mostrará como {formatPhoneDisplay(draft.whatsappNumber)}
            </p>
          </div>

          <div>
            <label className={label} htmlFor="s-currency">Moneda</label>
            <select
              id="s-currency"
              value={draft.currency}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  currency: e.target.value as StoreSettings['currency'],
                  currencySymbol: e.target.value === 'EUR' ? '€' : '$',
                })
              }
              className={cx(field, 'cursor-pointer')}
            >
              <option value="COP" className="bg-obsidian">COP · Peso colombiano</option>
              <option value="USD" className="bg-obsidian">USD · Dólar</option>
              <option value="MXN" className="bg-obsidian">MXN · Peso mexicano</option>
              <option value="EUR" className="bg-obsidian">EUR · Euro</option>
            </select>
          </div>

          <div>
            <label className={label} htmlFor="s-ig">Instagram</label>
            <input
              id="s-ig"
              value={draft.instagramHandle}
              onChange={(e) => setDraft({ ...draft, instagramHandle: e.target.value })}
              className={field}
            />
          </div>

          <div>
            <label className={label} htmlFor="s-tk">TikTok</label>
            <input
              id="s-tk"
              value={draft.tiktokHandle}
              onChange={(e) => setDraft({ ...draft, tiktokHandle: e.target.value })}
              className={field}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={label} htmlFor="s-cities">Ciudades de operación</label>
            <input
              id="s-cities"
              value={draft.locationCity}
              onChange={(e) => setDraft({ ...draft, locationCity: e.target.value })}
              className={field}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={label} htmlFor="s-guarantee">Texto de garantía</label>
            <input
              id="s-guarantee"
              value={draft.guaranteeText}
              onChange={(e) => setDraft({ ...draft, guaranteeText: e.target.value })}
              className={field}
            />
            <p className="text-[10.5px] text-marble/30 mt-1.5">
              Primer párrafo del pie, junto a las ciudades de operación.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className={label} htmlFor="s-ann">Banner superior</label>
            <input
              id="s-ann"
              value={draft.announcement}
              onChange={(e) => setDraft({ ...draft, announcement: e.target.value })}
              className={field}
            />
            <label className="flex items-center gap-2.5 mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.showAnnouncement}
                onChange={(e) => setDraft({ ...draft, showAnnouncement: e.target.checked })}
                className="w-4 h-4 accent-lapis"
              />
              <span className="text-[12px] text-marble/60">Mostrar el banner</span>
            </label>
          </div>

          <div className="sm:col-span-2">
            <label className={label} htmlFor="s-template">Plantilla del mensaje de WhatsApp</label>
            <textarea
              id="s-template"
              rows={3}
              value={draft.whatsappMessageTemplate}
              onChange={(e) =>
                setDraft({ ...draft, whatsappMessageTemplate: e.target.value })
              }
              className={cx(field, 'resize-y font-mono text-[11.5px]')}
            />
            <p className="text-[10.5px] text-marble/30 mt-2 leading-relaxed">
              Variables disponibles:{' '}
              <code className="text-silver">{'{modelo}'}</code>{' '}
              <code className="text-silver">{'{talla}'}</code>{' '}
              <code className="text-silver">{'{precio}'}</code>{' '}
              <code className="text-silver">{'{categoria}'}</code>. Se reemplazan
              automáticamente con los datos del par que abre el cliente.
            </p>
          </div>
        </div>

        <button
          onClick={saveSettings}
          className="flex items-center gap-2.5 px-6 py-3.5 bg-marble text-obsidian text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-silver transition-colors"
        >
          <Save className="w-4 h-4" />
          Guardar ajustes
        </button>
      </section>

      {/* Nube */}
      <NubePanel />

      {/* Seguridad */}
      <section className="space-y-5">
        <div className="pb-4 border-b border-white/10">
          <h2 className="font-display text-2xl text-marble">Seguridad</h2>
          <p className="text-[12px] text-marble/40 mt-1">
            El PIN se guarda cifrado (SHA-256), nunca en texto plano.
          </p>
        </div>

        {validaEnServidor ? (
          <div className="bg-basalt border border-white/10 p-5 space-y-3">
            <div className="flex items-center gap-2.5 pb-3 border-b border-white/8">
              <KeyRound className="w-4 h-4 text-silver/70" />
              <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-marble">
                Cambiar PIN
              </h3>
            </div>
            <p className="text-[11.5px] text-marble/45 leading-relaxed">
              El PIN de este sitio lo verifica el servidor, así que no se cambia
              desde aquí: cámbialo en Vercel. Genera el hash del PIN nuevo abajo,
              reemplaza la variable <code className="text-silver">ADMIN_PIN_HASH</code>{' '}
              y vuelve a desplegar. Mientras no lo hagas, sigue valiendo el
              anterior.
            </p>
          </div>
        ) : (
        <div className="bg-basalt border border-white/10 p-5">
          <form onSubmit={submitPinChange} className="space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-white/8">
              <KeyRound className="w-4 h-4 text-silver/70" />
              <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-marble">
                Cambiar PIN
              </h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={label} htmlFor="p-current">PIN actual</label>
                <input
                  id="p-current"
                  type="password"
                  inputMode="numeric"
                  value={currentPin}
                  onChange={(e) => {
                    setCurrentPin(e.target.value);
                    setPinNotice(null);
                  }}
                  className={cx(field, 'tracking-[0.3em]')}
                  required
                />
              </div>
              <div>
                <label className={label} htmlFor="p-new">PIN nuevo (6–12 dígitos)</label>
                <input
                  id="p-new"
                  type="password"
                  inputMode="numeric"
                  value={newPin}
                  onChange={(e) => {
                    setNewPin(e.target.value);
                    setPinNotice(null);
                  }}
                  className={cx(field, 'tracking-[0.3em]')}
                  required
                />
              </div>
            </div>

            {pinNotice && (
              <p
                role="alert"
                className={cx(
                  'text-[11.5px]',
                  pinNotice.tone === 'ok' ? 'text-emerald-300' : 'text-red-300',
                )}
              >
                {pinNotice.text}
              </p>
            )}

            <button
              type="submit"
              className="px-5 py-3 border border-white/14 text-marble/70 hover:text-marble hover:border-silver/45 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors"
            >
              Actualizar PIN
            </button>
          </form>
        </div>
        )}

        {/* Puente hacia Vercel: el hash se calcula aquí, en el navegador, para
            que el PIN no tenga que pasar por una terminal ni por un archivo. */}
        <div className="bg-basalt border border-white/10 p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/8">
            <KeyRound className="w-4 h-4 text-silver/70" />
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-marble">
              Hash para Vercel
            </h3>
          </div>

          <p className="text-[11.5px] text-marble/45 leading-relaxed">
            Escribe el PIN que quieras usar en el sitio publicado y copia el hash
            a la variable <code className="text-silver">ADMIN_PIN_HASH</code> en
            Vercel (Settings › Environment Variables). Es la que usa el servidor
            para validar el ingreso y autorizar los cambios. El PIN no sale de
            este navegador: solo se copia el hash, que no se puede devolver al
            PIN.
          </p>

          <div>
            <label className={label} htmlFor="p-hash">PIN a convertir</label>
            <input
              id="p-hash"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={hashSource}
              onChange={(e) => void updateHashSource(e.target.value)}
              className={cx(field, 'tracking-[0.3em]')}
            />
          </div>

          {hashResult && (
            <div>
              <label className={label} htmlFor="p-hash-out">Hash SHA-256</label>
              <input
                id="p-hash-out"
                readOnly
                value={hashResult}
                onFocus={(e) => e.currentTarget.select()}
                className={cx(field, 'font-mono text-[10.5px]')}
              />
            </div>
          )}
        </div>

        <p className="text-[11.5px] leading-relaxed text-marble/35 border-l-2 border-silver/35 pl-4 py-1">
          {validaEnServidor
            ? 'El PIN se compara en el servidor y el hash no viaja en el sitio, así que no se puede probar por fuerza bruta sin conexión. Cinco intentos fallidos bloquean quince minutos, también del lado del servidor.'
            : 'Sin las variables del servidor la validación ocurre en el navegador. Sirve para que un visitante casual no entre, pero no frena a alguien con conocimientos técnicos, y los cambios no salen de este equipo. Los pasos para activarla están en el README.'}
        </p>
      </section>

      {/* Anuncio emergente */}
      <section className="space-y-5">
        <div className="pb-4 border-b border-white/10">
          <h2 className="font-display text-2xl text-marble flex items-center gap-2.5">
            <Megaphone className="w-5 h-5 text-silver" />
            Anuncio emergente
          </h2>
          <p className="text-[12px] text-marble/40 mt-1">
            El flyer que aparece al entrar a la portada, segundo y medio después
            de cargar. Solo ahí: no sale en el catálogo ni en las demás páginas.
          </p>
        </div>

        <PopupAnnouncementEditor
          value={draft.popupAnnouncement}
          onChange={saveAnnouncement}
        />
      </section>

      {/* Historias */}
      <section className="space-y-5">
        <div className="pb-4 border-b border-white/10">
          <h2 className="font-display text-2xl text-marble">Historias</h2>
          <p className="text-[12px] text-marble/40 mt-1">
            Los círculos de la portada. Las fotos que subas aquí reemplazan a
            las de ejemplo.
          </p>
        </div>

        <StorySlidesEditor
          title="Envíos"
          hint="Empaque, guías, despachos. Lo que quieras que vea quien duda de cómo llega el par."
          slides={draft.shippingSlides}
          onChange={(slides) => saveSlides('shippingSlides', slides)}
        />

        <StorySlidesEditor
          title="Promos"
          hint="Combos y descuentos vigentes. Bórralos cuando se acaben: quedan publicados hasta que los quites."
          slides={draft.promoSlides}
          onChange={(slides) => saveSlides('promoSlides', slides)}
        />

        <StorySlidesEditor
          title="Reseñas"
          hint="Capturas de lo que te escriben los clientes. Tapa los datos personales antes de subirlas."
          slides={draft.reviewSlides}
          onChange={(slides) => saveSlides('reviewSlides', slides)}
        />

        {/* Clientes no se edita aquí: sus fotos son las entregas reales, que
            ya tienen su propia pestaña con ciudad, barrio y fecha. */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-basalt border border-white/10 p-5">
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-marble">
              Clientes
            </h3>
            <p className="text-[11px] text-marble/35 mt-1.5 leading-relaxed">
              Esta historia se arma sola con las {deliveries.length} entregas
              cargadas. Se edita desde la pestaña Entregas.
            </p>
          </div>
          {onGoToDeliveries && (
            <button
              type="button"
              onClick={onGoToDeliveries}
              className="flex items-center gap-2 px-4 py-2.5 border border-white/12 text-[10px] font-semibold uppercase tracking-[0.16em] text-marble/65 hover:text-marble hover:border-silver/40 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              Ir a Entregas
            </button>
          )}
        </div>
      </section>

      {/* Datos */}
      <section className="space-y-5">
        <div className="pb-4 border-b border-white/10">
          <h2 className="font-display text-2xl text-marble">Respaldos</h2>
          <p className="text-[12px] text-marble/40 mt-1">
            El catálogo vive en este navegador. Exporta seguido: si limpias los datos
            del navegador, se pierde.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportBackup}
            className="flex items-center gap-2 px-5 py-3 border border-white/14 text-marble/70 hover:text-marble hover:border-silver/45 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar respaldo
          </button>

          <label className="flex items-center gap-2 px-5 py-3 border border-white/14 text-marble/70 hover:text-marble hover:border-silver/45 text-[10px] font-bold uppercase tracking-[0.18em] cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            Restaurar respaldo
            <input
              ref={importRef}
              type="file"
              accept=".json,application/json"
              onChange={importBackup}
              className="hidden"
            />
          </label>

          <button
            onClick={() => {
              if (confirm('Esto reemplaza el catálogo actual por los pares de ejemplo. ¿Continuar?')) {
                resetCatalog();
                flash({ tone: 'ok', text: 'Catálogo de ejemplo restaurado.' });
              }
            }}
            className="flex items-center gap-2 px-5 py-3 border border-red-500/25 text-red-300/75 hover:text-red-200 hover:border-red-500/50 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors ml-auto"
          >
            <RotateCcw className="w-4 h-4" />
            Restaurar ejemplo
          </button>
        </div>
      </section>
    </div>
  );
}
