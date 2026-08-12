import { useEffect } from 'react';
import { X } from 'lucide-react';

const SIZE_CHART = [
  { eu: '35', usMen: '3.5', usWomen: '5', cm: '22.0' },
  { eu: '36', usMen: '4', usWomen: '5.5', cm: '22.5' },
  { eu: '37', usMen: '5', usWomen: '6.5', cm: '23.5' },
  { eu: '38', usMen: '5.5', usWomen: '7', cm: '24.0' },
  { eu: '39', usMen: '6.5', usWomen: '8', cm: '24.5' },
  { eu: '40', usMen: '7', usWomen: '8.5', cm: '25.0' },
  { eu: '41', usMen: '8', usWomen: '9.5', cm: '26.0' },
  { eu: '42', usMen: '8.5', usWomen: '10', cm: '26.5' },
  { eu: '43', usMen: '9.5', usWomen: '11', cm: '27.5' },
  { eu: '44', usMen: '10', usWomen: '11.5', cm: '28.0' },
  { eu: '45', usMen: '11', usWomen: '12.5', cm: '29.0' },
  { eu: '46', usMen: '12', usWomen: '13.5', cm: '30.0' },
];

export function SizeGuide({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-obsidian/92 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade"
      role="dialog"
      aria-modal="true"
      aria-label="Guía de tallas"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-basalt border border-silver/20 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <div>
            <h2 className="font-display text-2xl text-marble">Guía de tallas</h2>
            <p className="text-[11px] text-marble/40 mt-1">
              Mide tu pie por la tarde, de talón a dedo más largo.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 text-marble/50 hover:text-marble"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-obsidian">
              <tr className="text-[9px] uppercase tracking-[0.18em] text-marble/40">
                <th scope="col" className="text-left py-3 px-5 font-semibold">EU</th>
                <th scope="col" className="text-left py-3 px-3 font-semibold">US H</th>
                <th scope="col" className="text-left py-3 px-3 font-semibold">US M</th>
                <th scope="col" className="text-left py-3 px-5 font-semibold">CM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {SIZE_CHART.map((row) => (
                <tr key={row.eu} className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3 px-5 font-bold text-marble tabular-nums">{row.eu}</td>
                  <td className="py-3 px-3 text-marble/55 tabular-nums">{row.usMen}</td>
                  <td className="py-3 px-3 text-marble/55 tabular-nums">{row.usWomen}</td>
                  <td className="py-3 px-5 text-marble/55 tabular-nums">{row.cm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="px-6 py-4 text-[11px] leading-relaxed text-marble/40 border-t border-white/8">
          Jordan y Nike suelen tallar justo; en Yeezy y New Balance conviene subir
          media talla. Si dudas, escríbenos con tu medida en centímetros.
        </p>
      </div>
    </div>
  );
}
