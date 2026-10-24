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
        <p className="text-lectura text-secundario max-w-sm mx-auto leading-relaxed">
          El enlace que seguiste no lleva a ninguna parte. Vuelve a la entrada o
          mira el catálogo completo.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn">
          Ir a la entrada
        </Link>
        <Link to="/catalogo" className="btn btn-ghost">
          Ver catálogo
        </Link>
      </div>
    </div>
  );
}
