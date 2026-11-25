import PAGINAS from '../data/paginas.json';

export const SITIO = 'https://www.papishoes.shop';

export interface PaginaFija {
  ruta: string;
  titulo: string;
  descripcion: string;
  h1: string;
  intro: string;
}

/* Las mismas páginas que `scripts/generar-fichas.mjs` escribe como HTML
   estático. Este lado las mantiene al día cuando se navega sin recargar, que
   es lo que ve Google después de ejecutar el JavaScript. */
export const PAGINAS_FIJAS = PAGINAS as PaginaFija[];

export function paginaFija(pathname: string): PaginaFija | undefined {
  const ruta = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return PAGINAS_FIJAS.find((p) => p.ruta === ruta);
}

function etiqueta(selector: string, crear: () => HTMLElement): HTMLElement {
  return document.head.querySelector<HTMLElement>(selector) ?? document.head.appendChild(crear());
}

function meta(atributo: 'name' | 'property', nombre: string, valor: string) {
  etiqueta(`meta[${atributo}="${nombre}"]`, () => {
    const el = document.createElement('meta');
    el.setAttribute(atributo, nombre);
    return el;
  }).setAttribute('content', valor);
}

interface Metadatos {
  titulo: string;
  descripcion: string;
  /** Ruta sin parámetros: `?marca=` es un filtro de la misma página. */
  ruta: string;
}

export function ponMetadatos({ titulo, descripcion, ruta }: Metadatos) {
  const url = `${SITIO}${ruta}`;
  document.title = titulo;
  meta('name', 'description', descripcion);
  meta('property', 'og:title', titulo);
  meta('property', 'og:description', descripcion);
  meta('property', 'og:url', url);
  etiqueta('link[rel="canonical"]', () => {
    const el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    return el;
  }).setAttribute('href', url);
}

/**
 * Marca la vista como "no indexar" mientras está montada: páginas que no
 * existen y pares retirados. El servidor responde 200 a toda dirección (la
 * aplicación es una sola página), así que esta es la señal que le queda a
 * Google para no guardarlas como si fueran contenido.
 */
export function noIndexar(): () => void {
  /* Sin canónica: la que quedó puesta es la de la vista anterior, y "esta
     página es aquella" junto a "no la guardes" son dos señales que chocan.
     `ponMetadatos` la vuelve a crear al llegar a una página que sí existe. */
  document.head.querySelector('link[rel="canonical"]')?.remove();
  const el = document.createElement('meta');
  el.setAttribute('name', 'robots');
  el.setAttribute('content', 'noindex');
  document.head.appendChild(el);
  return () => el.remove();
}
