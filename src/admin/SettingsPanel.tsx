import { useRef, useState } from 'react';
import { Download, KeyRound, RotateCcw, Save, Upload } from 'lucide-react';
import type { StoreSettings } from '../types';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import {
  validateDeliveries,
  validateSettings,
  validateSneakers,
} from '../lib/validation';
import { cx, formatPhoneDisplay } from '../lib/utils';

const field =
  'w-full bg-obsidian border border-white/12 py-2.5 px-3 text-[12.5px] text-marble placeholder:text-marble/25 focus:outline-none focus:border-silver/50 transition-colors';

const label =
  'block text-[9px] font-semibold uppercase tracking-[0.2em] text-marble/40 mb-2';

type Notice = { tone: 'ok' | 'error'; text: string } | null;

export function SettingsPanel() {
  const {
    settings,
    setSettings,
    setSneakers,
    sneakers,
    deliveries,
    setDeliveries,
    resetCatalog,
  } = useStore();
  const { changePin } = useAuth();

  const [draft, setDraft] = useState<StoreSettings>(settings);
  const [notice, setNotice] = useState<Notice>(null);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinNotice, setPinNotice] = useState<Notice>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const flash = (n: Notice) => {
    setNotice(n);
    setTimeout(() => setNotice(null), 4000);
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
        flash({ tone: 'error', text: 'El archivo no es un respaldo válido de PAPI SHOES.' });
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

      {/* Seguridad */}
      <section className="space-y-5">
        <div className="pb-4 border-b border-white/10">
          <h2 className="font-display text-2xl text-marble">Seguridad</h2>
          <p className="text-[12px] text-marble/40 mt-1">
            El PIN se guarda cifrado (SHA-256), nunca en texto plano.
          </p>
        </div>

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

        <p className="text-[11.5px] leading-relaxed text-marble/35 border-l-2 border-silver/35 pl-4 py-1">
          Este sitio funciona sin servidor, así que la validación ocurre en el
          navegador. Sirve para que un visitante casual no entre, pero no frena a
          alguien con conocimientos técnicos. Si vas a manejar datos de clientes o
          pagos, monta un backend: está explicado en el README.
        </p>
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
