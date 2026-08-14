import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  LayoutGrid,
  LogOut,
  Plus,
  Settings2,
} from 'lucide-react';
import type { Sneaker } from '../types';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { AdminLogin } from '../admin/AdminLogin';
import { QuickEditor } from '../admin/QuickEditor';
import { SneakerForm } from '../admin/SneakerForm';
import { SettingsPanel } from '../admin/SettingsPanel';
import { DeliveryManager } from '../admin/DeliveryManager';
import { TempleMark } from '../components/ui/TempleMark';
import { cx, formatPrice } from '../lib/utils';

type Tab = 'inventory' | 'form' | 'deliveries' | 'settings';

export function AdminPage() {
  const { isAuthenticated, isChecking, logout } = useAuth();
  const { sneakers, settings, deliveries, storageWarning } = useStore();
  const [tab, setTab] = useState<Tab>('inventory');
  const [editing, setEditing] = useState<Sneaker | null>(null);

  if (isChecking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <TempleMark className="w-10 h-10 opacity-30 animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated) return <AdminLogin />;

  const openForm = (sneaker: Sneaker | null) => {
    setEditing(sneaker);
    setTab('form');
  };

  const closeForm = () => {
    setEditing(null);
    setTab('inventory');
  };

  const stats = [
    ['Pares', sneakers.length],
    ['Originales', sneakers.filter((s) => s.category === 'originales').length],
    ['Sneakers', sneakers.filter((s) => s.category === 'general').length],
    ['Entregas', deliveries.length],
  ] as const;

  const TABS: { id: Tab; label: string; Icon: typeof LayoutGrid }[] = [
    { id: 'inventory', label: 'Inventario', Icon: LayoutGrid },
    { id: 'form', label: editing ? 'Editando' : 'Nuevo par', Icon: Plus },
    { id: 'deliveries', label: 'Entregas', Icon: Camera },
    { id: 'settings', label: 'Ajustes', Icon: Settings2 },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-5 lg:px-8 py-10">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-6 border-b border-white/10">
        <div className="flex items-center gap-4">
          <TempleMark className="w-9 h-9" />
          <div>
            <h1 className="font-display text-xl text-marble">Panel de administración</h1>
            <p className="text-[11px] text-marble/35 mt-0.5">
              Sesión activa · expira en 2 horas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-marble/50 hover:text-marble transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Ver el sitio
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2.5 border border-white/12 text-[10px] font-semibold uppercase tracking-[0.18em] text-marble/60 hover:text-marble hover:border-silver/40 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Salir
          </button>
        </div>
      </div>

      {storageWarning && (
        <p className="mt-4 bg-red-950/35 border border-red-500/30 px-4 py-3.5 text-[12px] text-red-200 leading-relaxed">
          {storageWarning}
        </p>
      )}

      {/* Métricas */}
      <dl className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-white/8 border border-white/8 mt-6">
        {stats.map(([label, value]) => (
          <div key={label} className="bg-basalt px-5 py-4">
            <dt className="text-[9px] uppercase tracking-[0.2em] text-marble/40">
              {label}
            </dt>
            <dd className="font-display text-2xl text-marble mt-1.5 tabular-nums">
              {value}
            </dd>
          </div>
        ))}
        <div className="bg-basalt px-5 py-4 col-span-2 lg:col-span-1">
          <dt className="text-[9px] uppercase tracking-[0.2em] text-marble/40">
            Valor total
          </dt>
          <dd className="font-display text-2xl text-marble mt-1.5 truncate">
            {formatPrice(
              sneakers.reduce((sum, s) => sum + s.price, 0),
              settings.currency,
              settings.currencySymbol,
            )}
          </dd>
        </div>
      </dl>

      {/* Pestañas */}
      <nav className="flex gap-px border border-white/10 mt-8 overflow-x-auto no-scrollbar">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => {
              if (id === 'form' && tab !== 'form') setEditing(null);
              setTab(id);
            }}
            className={cx(
              'flex items-center gap-2 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] whitespace-nowrap transition-colors',
              tab === id
                ? 'bg-marble text-obsidian'
                : 'bg-obsidian text-marble/45 hover:text-marble',
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </nav>

      {/* Contenido */}
      <div className="py-9">
        {tab === 'inventory' && (
          <QuickEditor onEdit={openForm} onCreate={() => openForm(null)} />
        )}
        {tab === 'form' && (
          <SneakerForm key={editing?.id ?? 'new'} editing={editing} onDone={closeForm} />
        )}
        {tab === 'deliveries' && <DeliveryManager />}
        {tab === 'settings' && (
          <SettingsPanel onGoToDeliveries={() => setTab('deliveries')} />
        )}
      </div>
    </div>
  );
}
