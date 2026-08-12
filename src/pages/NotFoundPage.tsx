import { Link } from 'react-router-dom';
import { TempleMark } from '../components/ui/TempleMark';

export function NotFoundPage() {
  return (
    <div className="min-h-[65vh] flex flex-col items-center justify-center px-6 text-center gap-7">
      <TempleMark className="w-14 h-14 opacity-45" />
      <div className="space-y-3">
        <p className="eyebrow">Error 404</p>
        <h1 className="font-display text-5xl sm:text-6xl text-marble">
          Esta página no existe
        </h1>
        <p className="text-[13px] text-marble/45 max-w-sm mx-auto leading-relaxed">
          El enlace que seguiste no lleva a ninguna parte. Vuelve a la entrada o
          mira el catálogo completo.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="px-7 py-3.5 bg-marble text-obsidian text-[10px] font-bold uppercase tracking-[0.22em] hover:bg-silver transition-colors"
        >
          Ir a la entrada
        </Link>
        <Link
          to="/catalogo"
          className="px-7 py-3.5 border border-white/15 text-marble/70 text-[10px] font-bold uppercase tracking-[0.22em] hover:text-marble hover:border-silver/40 transition-colors"
        >
          Ver catálogo
        </Link>
      </div>
    </div>
  );
}
