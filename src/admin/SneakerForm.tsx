import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Save, Trash2, Upload, X } from 'lucide-react';
import type { Sneaker, SneakerBrand, SneakerGender, SneakerStatus } from '../types';
import { useStore } from '../context/StoreContext';
import { SmartImage } from '../components/ui/SmartImage';
import { sanitizeImageUrl, uuid } from '../lib/security';
import { convertFileToBase64, cx } from '../lib/utils';

const BRANDS: SneakerBrand[] = [
  'Jordan',
  'Nike',
  'Adidas',
  'Yeezy',
  'New Balance',
  'Travis Scott',
  'Off-White',
  'Louis Vuitton',
  'Puma',
  'Asics',
  'Otras',
];

const SIZES = [35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46];

const field =
  'w-full bg-obsidian border border-white/12 py-2.5 px-3 text-[12.5px] text-marble placeholder:text-marble/25 focus:outline-none focus:border-silver/50 transition-colors';

const label =
  'block text-[9px] font-semibold uppercase tracking-[0.2em] text-marble/40 mb-2';

function blank(): Partial<Sneaker> {
  return {
    name: '',
    brand: 'Jordan',
    model: '',
    sku: '',
    category: 'originales',
    gender: 'unisex',
    price: 0,
    images: [],
    sizes: [39, 40, 41, 42, 43],
    status: 'disponible',
    isFeatured: true,
    isNewArrival: true,
    description: '',
    details: {
      condition: 'Nuevo en caja original',
      colorway: '',
      includedItems: ['Caja original', 'Cordones extras'],
    },
  };
}

interface SneakerFormProps {
  editing: Sneaker | null;
  onDone: () => void;
}

export function SneakerForm({ editing, onDone }: SneakerFormProps) {
  const { upsertSneaker, removeSneaker } = useStore();
  const [form, setForm] = useState<Partial<Sneaker>>(editing ?? blank());
  const [imageUrl, setImageUrl] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const patch = (updates: Partial<Sneaker>) => setForm((prev) => ({ ...prev, ...updates }));

  const addLocalImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const encoded = await Promise.all(files.map(convertFileToBase64));
      patch({ images: [...(form.images ?? []), ...encoded] });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'No se pudo cargar la imagen.');
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const addUrlImage = () => {
    const clean = sanitizeImageUrl(imageUrl);
    if (!imageUrl.trim()) return;
    if (clean.startsWith('data:image/svg')) {
      setUploadError('Esa URL no es válida. Debe empezar por https://');
      return;
    }
    patch({ images: [...(form.images ?? []), clean] });
    setImageUrl('');
    setUploadError(null);
  };

  const toggleSize = (size: number) => {
    const current = (form.sizes ?? []) as (number | string)[];
    patch({
      sizes: current.some((s) => Number(s) === size)
        ? current.filter((s) => Number(s) !== size)
        : [...current, size].sort((a, b) => Number(a) - Number(b)),
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    const isOriginal = form.category === 'originales';

    const sneaker: Sneaker = {
      id: editing?.id ?? `sneaker-${uuid()}`,
      name: form.name!.trim(),
      brand: form.brand ?? 'Otras',
      model: form.model?.trim() || form.name!.trim(),
      sku: form.sku?.trim() || `PAPI-${Math.floor(1000 + Math.random() * 9000)}`,
      category: form.category ?? 'general',
      gender: form.gender ?? 'unisex',
      price: Number(form.price) || 0,
      originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
      images: form.images?.length ? form.images : [sanitizeImageUrl(null)],
      sizes: form.sizes?.length ? form.sizes : [39, 40, 41, 42, 43],
      status: form.status ?? 'disponible',
      isFeatured: form.isFeatured ?? false,
      isNewArrival: form.isNewArrival ?? false,
      isOriginalCertified: isOriginal,
      description: form.description?.trim() ?? '',
      details: {
        condition: form.details?.condition?.trim() || 'Nuevo en caja',
        colorway: form.details?.colorway?.trim() ?? '',
        includedItems: form.details?.includedItems ?? [],
        releaseYear: form.details?.releaseYear,
        qualityBadge: form.details?.qualityBadge,
        authenticityNotes: form.details?.authenticityNotes,
      },
      viewsCount: editing?.viewsCount ?? 0,
      inquiriesCount: editing?.inquiriesCount ?? 0,
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
    };

    upsertSneaker(sneaker);
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between gap-4 pb-5 border-b border-white/10">
        <h2 className="font-display text-2xl text-marble">
          {editing ? 'Editar par' : 'Nuevo par'}
        </h2>
        <button
          type="button"
          onClick={onDone}
          className="text-[10px] uppercase tracking-[0.2em] text-marble/45 hover:text-marble transition-colors"
        >
          Cancelar
        </button>
      </div>

      {/* Identidad */}
      <fieldset className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <legend className="sr-only">Datos del producto</legend>

        <div className="sm:col-span-2 lg:col-span-1">
          <label className={label} htmlFor="f-name">Nombre del par *</label>
          <input
            id="f-name"
            required
            value={form.name ?? ''}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Air Jordan 1 High OG UNC Toe"
            className={field}
          />
        </div>

        <div>
          <label className={label} htmlFor="f-brand">Marca</label>
          <select
            id="f-brand"
            value={form.brand}
            onChange={(e) => patch({ brand: e.target.value as SneakerBrand })}
            className={cx(field, 'cursor-pointer')}
          >
            {BRANDS.map((b) => (
              <option key={b} value={b} className="bg-obsidian">{b}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={label} htmlFor="f-sku">Referencia / SKU</label>
          <input
            id="f-sku"
            value={form.sku ?? ''}
            onChange={(e) => patch({ sku: e.target.value })}
            placeholder="DZ5485-400"
            className={cx(field, 'font-mono')}
          />
        </div>

        <div>
          <label className={label} htmlFor="f-price">Precio *</label>
          <input
            id="f-price"
            type="number"
            min={0}
            required
            value={form.price || ''}
            onChange={(e) => patch({ price: Number(e.target.value) })}
            placeholder="850000"
            className={cx(field, 'tabular-nums')}
          />
        </div>

        <div>
          <label className={label} htmlFor="f-before">Precio anterior</label>
          <input
            id="f-before"
            type="number"
            min={0}
            value={form.originalPrice ?? ''}
            onChange={(e) =>
              patch({ originalPrice: e.target.value ? Number(e.target.value) : undefined })
            }
            placeholder="Sin descuento"
            className={cx(field, 'tabular-nums')}
          />
        </div>

        <div>
          <label className={label} htmlFor="f-status">Disponibilidad</label>
          <select
            id="f-status"
            value={form.status}
            onChange={(e) => patch({ status: e.target.value as SneakerStatus })}
            className={cx(field, 'cursor-pointer')}
          >
            <option value="disponible" className="bg-obsidian">Entrega inmediata</option>
            <option value="bajo_encargo" className="bg-obsidian">Bajo encargo</option>
            <option value="agotado" className="bg-obsidian">Agotado</option>
          </select>
        </div>

        <div>
          <label className={label} htmlFor="f-gender">Horma</label>
          <select
            id="f-gender"
            value={form.gender}
            onChange={(e) => patch({ gender: e.target.value as SneakerGender })}
            className={cx(field, 'cursor-pointer')}
          >
            <option value="unisex" className="bg-obsidian">Unisex</option>
            <option value="hombre" className="bg-obsidian">Hombre</option>
            <option value="mujer" className="bg-obsidian">Mujer</option>
          </select>
        </div>

        <div>
          <label className={label} htmlFor="f-colorway">Colorway</label>
          <input
            id="f-colorway"
            value={form.details?.colorway ?? ''}
            onChange={(e) =>
              patch({ details: { ...form.details!, colorway: e.target.value } })
            }
            placeholder="University Blue / Black"
            className={field}
          />
        </div>
      </fieldset>

      {/* Línea */}
      <fieldset className="space-y-3">
        <legend className={label}>Línea del catálogo</legend>
        <div className="grid sm:grid-cols-2 gap-px border border-white/12">
          {(
            [
              {
                value: 'originales',
                title: 'Originales',
                text: 'Pasó legit check. Se muestra con comprobante de autenticidad.',
              },
              {
                value: 'general',
                title: 'Sneakers',
                text: 'Buena factura para uso diario. No se vende como original.',
              },
            ] as const
          ).map((room) => (
            <button
              key={room.value}
              type="button"
              onClick={() => patch({ category: room.value })}
              className={cx(
                'text-left p-4 transition-colors',
                form.category === room.value
                  ? 'bg-marble text-obsidian'
                  : 'bg-obsidian text-marble/55 hover:text-marble',
              )}
            >
              <span className="block text-[11px] font-bold uppercase tracking-[0.14em]">
                {room.title}
              </span>
              <span
                className={cx(
                  'block text-[11px] mt-1.5 leading-relaxed',
                  form.category === room.value ? 'text-obsidian/70' : 'text-marble/35',
                )}
              >
                {room.text}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      {/* Fotos */}
      <fieldset className="space-y-4">
        <legend className={label}>Fotos ({form.images?.length ?? 0})</legend>

        <div className="grid sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isUploading}
            className="flex items-center justify-center gap-2 py-3 border border-white/14 text-marble/65 hover:text-marble hover:border-silver/45 text-[10px] font-semibold uppercase tracking-[0.18em] disabled:opacity-50 transition-colors"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Subir desde el dispositivo
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*"
            onChange={addLocalImages}
            className="hidden"
          />

          <div className="flex gap-2">
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addUrlImage();
                }
              }}
              placeholder="Pegar URL (https://...)"
              className={field}
            />
            <button
              type="button"
              onClick={addUrlImage}
              aria-label="Añadir imagen por URL"
              className="px-3.5 border border-white/14 text-marble/65 hover:text-marble transition-colors"
            >
              <ImagePlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {uploadError && (
          <p role="alert" className="text-[11.5px] text-red-300">
            {uploadError}
          </p>
        )}

        {form.images && form.images.length > 0 && (
          <div className="flex flex-wrap gap-2.5">
            {form.images.map((img, i) => (
              <div
                key={i}
                className="relative w-20 h-20 border border-white/12 bg-obsidian group"
              >
                <SmartImage src={img} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() =>
                    patch({ images: form.images!.filter((_, idx) => idx !== i) })
                  }
                  aria-label={`Quitar foto ${i + 1}`}
                  className="absolute top-1 right-1 w-5 h-5 bg-obsidian/85 text-marble flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-0 inset-x-0 bg-marble text-obsidian text-[7px] font-bold uppercase tracking-[0.1em] text-center py-0.5">
                    Portada
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-marble/30 leading-relaxed">
          Las fotos subidas desde el dispositivo se guardan dentro del navegador y
          consumen espacio rápido. Para catálogos grandes usa URLs de un servicio
          de imágenes.
        </p>
      </fieldset>

      {/* Tallas */}
      <fieldset className="space-y-3">
        <legend className={label}>Tallas disponibles (EU)</legend>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((size) => {
            const active = (form.sizes ?? []).some((s) => Number(s) === size);
            return (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                aria-pressed={active}
                className={cx(
                  'w-12 h-11 text-[12px] font-semibold border transition-colors',
                  active
                    ? 'bg-marble text-obsidian border-marble'
                    : 'border-white/14 text-marble/50 hover:border-silver/45 hover:text-marble',
                )}
              >
                {size}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Textos */}
      <fieldset className="grid sm:grid-cols-2 gap-5">
        <legend className="sr-only">Descripción</legend>
        <div>
          <label className={label} htmlFor="f-condition">Estado</label>
          <input
            id="f-condition"
            value={form.details?.condition ?? ''}
            onChange={(e) =>
              patch({ details: { ...form.details!, condition: e.target.value } })
            }
            className={field}
          />
        </div>
        <div>
          <label className={label} htmlFor="f-year">Año de lanzamiento</label>
          <input
            id="f-year"
            type="number"
            min={1970}
            max={2100}
            value={form.details?.releaseYear ?? ''}
            onChange={(e) =>
              patch({
                details: {
                  ...form.details!,
                  releaseYear: e.target.value ? Number(e.target.value) : undefined,
                },
              })
            }
            className={cx(field, 'tabular-nums')}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="f-desc">Descripción</label>
          <textarea
            id="f-desc"
            rows={3}
            value={form.description ?? ''}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="Materiales, amortiguación, qué lo hace especial…"
            className={cx(field, 'resize-y')}
          />
        </div>
      </fieldset>

      {/* Destacados */}
      <fieldset className="flex flex-wrap gap-6">
        <legend className="sr-only">Visibilidad</legend>
        {(
          [
            ['isFeatured', 'Mostrar en portada'],
            ['isNewArrival', 'Marcar como nuevo'],
          ] as const
        ).map(([key, text]) => (
          <label key={key} className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(form[key])}
              onChange={(e) => patch({ [key]: e.target.checked })}
              className="w-4 h-4 accent-lapis"
            />
            <span className="text-[12px] text-marble/65">{text}</span>
          </label>
        ))}
      </fieldset>

      {/* Acciones */}
      <div className="flex items-center justify-between gap-4 pt-6 border-t border-white/10">
        {editing ? (
          <button
            type="button"
            onClick={() => {
              removeSneaker(editing.id);
              onDone();
            }}
            className="flex items-center gap-2 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-red-300/80 hover:text-red-200 hover:bg-red-950/40 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar
          </button>
        ) : (
          <span />
        )}

        <button
          type="submit"
          className="flex items-center gap-2.5 px-7 py-3.5 bg-marble text-obsidian text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-silver transition-colors"
        >
          <Save className="w-4 h-4" />
          {editing ? 'Guardar cambios' : 'Publicar par'}
        </button>
      </div>
    </form>
  );
}
