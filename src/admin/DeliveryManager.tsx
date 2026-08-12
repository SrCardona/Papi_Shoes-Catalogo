import { useMemo, useRef, useState } from 'react';
import {
  ImagePlus,
  Loader2,
  MapPin,
  Pencil,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { Delivery } from '../types';
import { useStore } from '../context/StoreContext';
import { SmartImage } from '../components/ui/SmartImage';
import { sanitizeImageUrl, uuid } from '../lib/security';
import {
  compressImageFile,
  cx,
  formatMonthYear,
  toDateInputValue,
} from '../lib/utils';

const field =
  'w-full bg-obsidian border border-white/12 py-2.5 px-3 text-[12.5px] text-marble placeholder:text-marble/25 focus:outline-none focus:border-silver/50 transition-colors';

const label =
  'block text-[9px] font-semibold uppercase tracking-[0.2em] text-marble/40 mb-2';

interface Draft {
  id: string | null;
  image: string;
  city: string;
  neighborhood: string;
  productName: string;
  note: string;
  deliveredAt: string;
  locationInImage: boolean;
}

function blankDraft(): Draft {
  return {
    id: null,
    image: '',
    city: '',
    neighborhood: '',
    productName: '',
    note: '',
    deliveredAt: new Date().toISOString().slice(0, 10),
    locationInImage: false,
  };
}

export function DeliveryManager() {
  const { deliveries, sneakers, upsertDelivery, removeDelivery } = useStore();

  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const patch = (updates: Partial<Draft>) =>
    setDraft((prev) => ({ ...prev, ...updates }));

  /* Ciudades y barrios ya usados: evita que "Medellin" y "Medellín" queden
     como dos ciudades distintas en el muro público. */
  const knownCities = useMemo(
    () => [...new Set(deliveries.map((d) => d.city))].sort(),
    [deliveries],
  );
  const knownNeighborhoods = useMemo(
    () => [...new Set(deliveries.map((d) => d.neighborhood).filter(Boolean))].sort(),
    [deliveries],
  );

  const sorted = useMemo(
    () =>
      [...deliveries].sort(
        (a, b) => Date.parse(b.deliveredAt) - Date.parse(a.deliveredAt),
      ),
    [deliveries],
  );

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      // Se recomprime antes de guardar: una foto de celular sin tratar llena
      // el almacenamiento del navegador en unas 15 entregas.
      patch({ image: await compressImageFile(file) });
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
    patch({ image: clean });
    setImageUrl('');
    setError(null);
  };

  const startEdit = (delivery: Delivery) => {
    setDraft({
      id: delivery.id,
      image: delivery.image,
      city: delivery.city,
      neighborhood: delivery.neighborhood,
      productName: delivery.productName ?? '',
      note: delivery.note ?? '',
      deliveredAt: toDateInputValue(delivery.deliveredAt),
      locationInImage: delivery.locationInImage,
    });
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.image) {
      setError('Falta la foto de la entrega.');
      return;
    }
    if (!draft.city.trim()) {
      setError('Falta la ciudad.');
      return;
    }

    const now = new Date().toISOString();
    const delivery: Delivery = {
      id: draft.id ?? `entrega-${uuid()}`,
      image: draft.image,
      city: draft.city.trim(),
      neighborhood: draft.neighborhood.trim(),
      productName: draft.productName.trim() || undefined,
      note: draft.note.trim() || undefined,
      deliveredAt: draft.deliveredAt
        ? new Date(`${draft.deliveredAt}T00:00:00Z`).toISOString()
        : now,
      locationInImage: draft.locationInImage,
      createdAt: now,
    };

    upsertDelivery(delivery);
    setDraft(blankDraft());
    setError(null);
  };

  return (
    <div className="space-y-12">
      {/* ── Formulario ─────────────────────────────────────────────────── */}
      <form onSubmit={submit} className="space-y-7 max-w-4xl">
        <div className="flex items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div>
            <h2 className="font-display text-2xl text-marble">
              {draft.id ? 'Editar entrega' : 'Nueva entrega'}
            </h2>
            <p className="text-[12px] text-marble/40 mt-1">
              Estas fotos se publican en El Templo, en el muro de entregas.
            </p>
          </div>
          {draft.id && (
            <button
              type="button"
              onClick={() => setDraft(blankDraft())}
              className="text-[10px] uppercase tracking-[0.2em] text-marble/45 hover:text-marble transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-7">
          {/* Foto */}
          <div className="space-y-3">
            <span className={label}>Foto de la entrega</span>

            <div className="relative aspect-[4/5] border border-white/12 bg-obsidian overflow-hidden">
              {draft.image ? (
                <>
                  <SmartImage
                    src={draft.image}
                    alt="Vista previa de la entrega"
                    className="w-full h-full object-cover"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-obsidian via-obsidian/70 to-transparent"
                  />
                  {!draft.locationInImage && (draft.city || draft.neighborhood) && (
                    <div className="absolute inset-x-0 bottom-0 p-3.5">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-marble">
                        <MapPin className="w-3.5 h-3.5 text-silver shrink-0" />
                        <span className="truncate">
                          {[draft.neighborhood, draft.city].filter(Boolean).join(' · ')}
                        </span>
                      </p>
                      <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-marble/45">
                        {formatMonthYear(`${draft.deliveredAt}T00:00:00Z`)}
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => patch({ image: '' })}
                    aria-label="Quitar foto"
                    className="absolute top-2 right-2 w-7 h-7 bg-obsidian/85 text-marble flex items-center justify-center hover:bg-obsidian transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-center px-6">
                  <p className="text-[11px] text-marble/30 leading-relaxed">
                    Así se verá la tarjeta en el sitio, con el rótulo de ubicación.
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={isUploading}
              className="flex items-center justify-center gap-2 w-full py-3 border border-white/14 text-marble/65 hover:text-marble hover:border-silver/45 text-[10px] font-semibold uppercase tracking-[0.18em] disabled:opacity-50 transition-colors"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isUploading ? 'Procesando…' : 'Subir foto'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={uploadPhoto}
              className="hidden"
            />

            <div className="flex gap-2">
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addUrlPhoto();
                  }
                }}
                placeholder="o pegar URL https://"
                className={field}
              />
              <button
                type="button"
                onClick={addUrlPhoto}
                aria-label="Usar imagen por URL"
                className="px-3.5 border border-white/14 text-marble/65 hover:text-marble transition-colors"
              >
                <ImagePlus className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[10.5px] text-marble/30 leading-relaxed">
              La foto se reduce automáticamente antes de guardarse para no llenar
              el almacenamiento del navegador.
            </p>
          </div>

          {/* Datos */}
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className={label} htmlFor="d-city">
                  Ciudad *
                </label>
                <input
                  id="d-city"
                  required
                  list="ciudades-conocidas"
                  value={draft.city}
                  onChange={(e) => patch({ city: e.target.value })}
                  placeholder="Medellín"
                  className={field}
                />
                <datalist id="ciudades-conocidas">
                  {knownCities.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className={label} htmlFor="d-hood">
                  Barrio o sector
                </label>
                <input
                  id="d-hood"
                  list="barrios-conocidos"
                  value={draft.neighborhood}
                  onChange={(e) => patch({ neighborhood: e.target.value })}
                  placeholder="Laureles"
                  className={field}
                />
                <datalist id="barrios-conocidos">
                  {knownNeighborhoods.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className={label} htmlFor="d-date">
                  Fecha de entrega
                </label>
                <input
                  id="d-date"
                  type="date"
                  value={draft.deliveredAt}
                  onChange={(e) => patch({ deliveredAt: e.target.value })}
                  className={cx(field, 'tabular-nums')}
                />
              </div>

              <div>
                <label className={label} htmlFor="d-product">
                  Par entregado
                </label>
                <input
                  id="d-product"
                  list="pares-del-catalogo"
                  value={draft.productName}
                  onChange={(e) => patch({ productName: e.target.value })}
                  placeholder="Air Jordan 1 High OG"
                  className={field}
                />
                <datalist id="pares-del-catalogo">
                  {sneakers.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className={label} htmlFor="d-note">
                Nota corta
              </label>
              <input
                id="d-note"
                value={draft.note}
                onChange={(e) => patch({ note: e.target.value })}
                placeholder="Entrega en mano, talla 42."
                className={field}
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer border border-white/12 p-4">
              <input
                type="checkbox"
                checked={draft.locationInImage}
                onChange={(e) => patch({ locationInImage: e.target.checked })}
                className="w-4 h-4 accent-lapis mt-0.5"
              />
              <span className="text-[12px] text-marble/65 leading-relaxed">
                La ubicación ya viene escrita dentro de la foto.
                <span className="block text-marble/35 mt-1">
                  Marca esto solo si la imagen trae el texto encima; el sitio deja
                  de dibujar el rótulo para no repetir el dato. La ciudad se sigue
                  usando para filtrar y contar.
                </span>
              </span>
            </label>

            {error && (
              <p role="alert" className="text-[11.5px] text-red-300">
                {error}
              </p>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="flex items-center gap-2.5 px-7 py-3.5 bg-marble text-obsidian text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-silver transition-colors"
              >
                <Save className="w-4 h-4" />
                {draft.id ? 'Guardar cambios' : 'Publicar entrega'}
              </button>
            </div>
          </div>
        </div>

        <p className="text-[11.5px] text-marble/40 leading-relaxed border-l-2 border-silver/40 pl-5 py-1 max-w-2xl">
          Antes de publicar: pide permiso al cliente si sale su cara, y no subas
          fotos donde se lea la dirección, la nomenclatura de la casa o la placa
          del carro. Barrio y ciudad son suficientes para mostrar cobertura.
        </p>
      </form>

      {/* ── Publicadas ─────────────────────────────────────────────────── */}
      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4 pb-4 border-b border-white/10">
          <h3 className="font-display text-xl text-marble">
            Entregas publicadas
          </h3>
          <span className="text-[10px] uppercase tracking-[0.2em] text-marble/35 tabular-nums">
            {deliveries.length} en el muro
          </span>
        </div>

        {sorted.length === 0 ? (
          <p className="text-[12.5px] text-marble/40 py-8 text-center border border-dashed border-white/12">
            Todavía no hay entregas. Sube la primera con el formulario de arriba.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-px bg-white/8 border border-white/8">
            {sorted.map((delivery) => (
              <article key={delivery.id} className="bg-basalt">
                <div className="relative aspect-[4/5] bg-obsidian overflow-hidden">
                  <SmartImage
                    src={delivery.image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    <button
                      onClick={() => startEdit(delivery)}
                      aria-label="Editar entrega"
                      className="w-7 h-7 bg-obsidian/85 text-marble flex items-center justify-center hover:bg-obsidian transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeDelivery(delivery.id)}
                      aria-label="Eliminar entrega"
                      className="w-7 h-7 bg-obsidian/85 text-red-300 flex items-center justify-center hover:bg-red-950 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="p-3.5 space-y-1">
                  <p className="text-[12px] font-semibold text-marble truncate">
                    {delivery.neighborhood
                      ? `${delivery.neighborhood} · ${delivery.city}`
                      : delivery.city}
                  </p>
                  {delivery.productName && (
                    <p className="text-[11px] text-marble/40 truncate">
                      {delivery.productName}
                    </p>
                  )}
                  <p className="text-[9px] uppercase tracking-[0.18em] text-marble/30">
                    {formatMonthYear(delivery.deliveredAt)}
                    {delivery.locationInImage && ' · rótulo en la foto'}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
