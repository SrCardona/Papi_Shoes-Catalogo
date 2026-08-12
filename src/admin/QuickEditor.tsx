import { useState } from 'react';
import { Pencil, Plus, Trash2, Undo2 } from 'lucide-react';
import type { Sneaker, SneakerStatus } from '../types';
import { useStore } from '../context/StoreContext';
import { SmartImage } from '../components/ui/SmartImage';
import { cx, formatPrice } from '../lib/utils';

interface QuickEditorProps {
  onEdit: (sneaker: Sneaker) => void;
  onCreate: () => void;
}

const cell =
  'bg-obsidian border border-white/12 py-1.5 px-2.5 text-[12px] text-marble focus:outline-none focus:border-silver/50 transition-colors';

export function QuickEditor({ onEdit, onCreate }: QuickEditorProps) {
  const { sneakers, settings, patchSneaker, removeSneaker, restoreSneaker, lastRemoved } =
    useStore();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-2xl text-marble">Inventario</h2>
          <p className="text-[12px] text-marble/40 mt-1">
            Cambia precio y disponibilidad directo en la tabla. Se guarda al salir del campo.
          </p>
        </div>
        <button
          onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-marble text-obsidian text-[10px] font-bold uppercase tracking-[0.18em] hover:bg-silver transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar par
        </button>
      </div>

      {/* Deshacer — antes el borrado era definitivo y a un clic */}
      {lastRemoved && (
        <div className="flex items-center justify-between gap-4 bg-lapis/20 border border-lapis/40 px-4 py-3">
          <p className="text-[12px] text-marble/80">
            Eliminaste <span className="font-semibold">{lastRemoved.name}</span>.
          </p>
          <button
            onClick={restoreSneaker}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-marble hover:text-silver transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Deshacer
          </button>
        </div>
      )}

      <div className="border border-white/10 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-basalt border-b border-white/10">
            <tr className="text-[9px] uppercase tracking-[0.16em] text-marble/40">
              <th scope="col" className="py-3 px-4 font-semibold">Par</th>
              <th scope="col" className="py-3 px-3 font-semibold">Línea</th>
              <th scope="col" className="py-3 px-3 font-semibold">Precio</th>
              <th scope="col" className="py-3 px-3 font-semibold">Antes</th>
              <th scope="col" className="py-3 px-3 font-semibold">Estado</th>
              <th scope="col" className="py-3 px-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {sneakers.map((s) => (
              <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-2.5 px-4">
                  <div className="flex items-center gap-3 min-w-[220px]">
                    <SmartImage
                      src={s.images[0]}
                      alt=""
                      className="w-10 h-10 object-cover bg-obsidian border border-white/10 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-marble truncate">
                        {s.name}
                      </p>
                      <p className="text-[10px] text-marble/35 font-mono">{s.sku}</p>
                    </div>
                  </div>
                </td>

                <td className="py-2.5 px-3">
                  <button
                    onClick={() =>
                      patchSneaker(s.id, {
                        category: s.category === 'originales' ? 'general' : 'originales',
                        isOriginalCertified: s.category !== 'originales',
                      })
                    }
                    title="Cambiar de línea"
                    className={cx(
                      'px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] border transition-colors',
                      s.category === 'originales'
                        ? 'border-silver/50 text-silver'
                        : 'border-lapis/60 text-lapis-lit',
                    )}
                  >
                    {s.category === 'originales' ? 'Originales' : 'Sneakers'}
                  </button>
                </td>

                <td className="py-2.5 px-3">
                  <input
                    type="number"
                    min={0}
                    defaultValue={s.price}
                    aria-label={`Precio de ${s.name}`}
                    onBlur={(e) => {
                      const value = Number(e.target.value);
                      if (value > 0 && value !== s.price) patchSneaker(s.id, { price: value });
                    }}
                    className={cx(cell, 'w-28 font-semibold tabular-nums')}
                  />
                </td>

                <td className="py-2.5 px-3">
                  <input
                    type="number"
                    min={0}
                    defaultValue={s.originalPrice ?? ''}
                    placeholder="—"
                    aria-label={`Precio anterior de ${s.name}`}
                    onBlur={(e) => {
                      const raw = e.target.value;
                      const value = raw ? Number(raw) : undefined;
                      if (value !== s.originalPrice)
                        patchSneaker(s.id, { originalPrice: value });
                    }}
                    className={cx(cell, 'w-28 text-marble/55 tabular-nums')}
                  />
                </td>

                <td className="py-2.5 px-3">
                  <select
                    value={s.status}
                    aria-label={`Estado de ${s.name}`}
                    onChange={(e) =>
                      patchSneaker(s.id, { status: e.target.value as SneakerStatus })
                    }
                    className={cx(cell, 'cursor-pointer')}
                  >
                    <option value="disponible" className="bg-obsidian">Inmediata</option>
                    <option value="bajo_encargo" className="bg-obsidian">Bajo encargo</option>
                    <option value="agotado" className="bg-obsidian">Agotado</option>
                  </select>
                </td>

                <td className="py-2.5 px-4">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onEdit(s)}
                      aria-label={`Editar ${s.name}`}
                      className="p-2 text-marble/45 hover:text-marble hover:bg-white/6 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {confirmingId === s.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            removeSneaker(s.id);
                            setConfirmingId(null);
                          }}
                          className="px-2.5 py-1.5 bg-red-900/60 text-red-200 text-[9px] font-bold uppercase tracking-[0.12em] hover:bg-red-800 transition-colors"
                        >
                          Eliminar
                        </button>
                        <button
                          onClick={() => setConfirmingId(null)}
                          className="px-2 py-1.5 text-marble/45 text-[9px] uppercase tracking-[0.12em] hover:text-marble"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingId(s.id)}
                        aria-label={`Eliminar ${s.name}`}
                        className="p-2 text-marble/45 hover:text-red-300 hover:bg-red-950/40 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-marble/35 tabular-nums">
        {sneakers.length} pares · Valor del inventario:{' '}
        {formatPrice(
          sneakers.reduce((sum, s) => sum + s.price, 0),
          settings.currency,
          settings.currencySymbol,
        )}
      </p>
    </div>
  );
}
