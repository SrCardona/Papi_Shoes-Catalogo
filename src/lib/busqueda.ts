import type { Sneaker } from '../types';

/**
 * Si un par responde a lo que se escribió en un buscador.
 *
 * Es la única regla de búsqueda del sitio: la usan el catálogo y el buscador
 * del encabezado. Si cada uno buscara a su manera, el encabezado podría
 * prometer "3 resultados en Originales" y al llegar el catálogo mostrar otros.
 * `consulta` llega ya recortada y en minúsculas.
 */
export function coincideBusqueda(s: Sneaker, consulta: string): boolean {
  if (!consulta) return true;
  const texto = [
    s.name,
    s.brand,
    s.model,
    s.sku,
    s.details.colorway,
    s.description,
    ...(s.sizes ?? []).map(String),
  ]
    .join(' ')
    .toLowerCase();
  return texto.includes(consulta);
}
