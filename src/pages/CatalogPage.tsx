import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SneakerCategory } from '../types';
import { useStore } from '../context/StoreContext';
import { useCatalogFilters } from '../hooks/useCatalogFilters';
import { useGrupoOtras } from '../hooks/useMarcasPorLinea';
import { NO_ES_MARCA, esGrupoOtras, marcasVisiblesDelGrupo } from '../lib/marcas';
import { Colonnade } from '../components/ui/SneakerColumn';
import { FilterRail } from '../components/ui/FilterRail';
import { EmptyState } from '../components/ui/EmptyState';
import { SectionHeader } from '../components/ui/SectionHeader';

interface CatalogPageProps {
  /** Fija la línea: las vistas /originales y /sneakers reusan esta página. */
  category?: SneakerCategory;
  eyebrow?: string;
  title?: string;
  description?: string;
}

export function CatalogPage({
  category,
  eyebrow = 'Catálogo',
  title = 'Todo el templo',
  description = 'Originales y sneakers en una sola vista. Filtra por talla, marca o presupuesto.',
}: CatalogPageProps) {
  const { sneakers } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  /* El mismo reparto que arma el desplegable. Filtrar por "Otras marcas" no es
     filtrar por una marca sino por un conjunto, y ese conjunto tiene que salir
     de aquí: recalcularlo en esta pantalla es justo lo que haría que el conteo
     del menú y el del catálogo dejaran de coincidir. */
  const grupoOtras = useGrupoOtras(category);

  const {
    filters,
    updateFilters,
    resetFilters,
    results,
    availableBrands,
    availableSizes,
    activeFilterCount,
  } = useCatalogFilters(sneakers, category ? { category } : undefined);

  // La búsqueda del encabezado llega por querystring: /catalogo?q=jordan.
  // También se acepta /catalogo?marca=Adidas, que es el enlace directo a la
  // sección de una marca. Se consumen una sola vez y se limpia la URL, para
  // que al recargar no se vuelva a aplicar un filtro que el usuario ya quitó.
  const queryParam = searchParams.get('q') ?? '';
  const brandParam = searchParams.get('marca') ?? '';
  /* `?marca=` vacío es el "Ver todos" del menú, y significa quitar el filtro.
     Hay que distinguirlo de que no venga el parámetro: estando ya en la línea,
     un enlace a la ruta pelada no cambiaría la URL, React Router no navegaría
     y la marca se quedaría filtrada. */
  const limpiaMarca = searchParams.has('marca') && !brandParam;
  /* `?marca=otras` no nombra una marca, nombra al grupo. Se resuelve contra la
     línea que se está viendo, porque el umbral se evalúa por línea: la misma
     marca puede tener apartado propio en una y caer en el grupo en la otra. */
  const pideGrupo = esGrupoOtras(brandParam) && Boolean(grupoOtras?.count);
  const marcasDelGrupo = grupoOtras?.brands;
  /* Un `?marca=otras` que llega sin línea —`/catalogo`, que mezcla las dos— no
     tiene grupo al que apuntar, porque el umbral se evalúa por línea. En vez de
     dejar "otras" en minúsculas encabezando la vista, cae en la etiqueta
     literal del generador, que es lo más parecido a lo que el enlace pedía. */
  const marcaNormalizada = esGrupoOtras(brandParam) ? NO_ES_MARCA : brandParam;

  useEffect(() => {
    if (!queryParam && !brandParam && !limpiaMarca) return;
    updateFilters({
      ...(queryParam ? { searchQuery: queryParam } : {}),
      ...(pideGrupo
        ? { brandGroup: marcasDelGrupo }
        : brandParam || limpiaMarca
          ? { brand: marcaNormalizada, brandGroup: [] }
          : {}),
    });
    setSearchParams({}, { replace: true });
  }, [
    queryParam,
    brandParam,
    limpiaMarca,
    pideGrupo,
    marcasDelGrupo,
    marcaNormalizada,
    updateFilters,
    setSearchParams,
  ]);

  const scopedTotal = category
    ? sneakers.filter((s) => s.category === category).length
    : sneakers.length;

  const pares = (n: number) => `${n} ${n === 1 ? 'par' : 'pares'}`;
  const enLaLinea = category ? `la línea ${title}` : 'todo el catálogo';

  /* Con una marca filtrada el encabezado lo dice, para que ver 37 pares donde
     antes había 497 no parezca que se perdió medio catálogo. */
  const marcaActiva = filters.brand;
  const grupoActivo = filters.brandGroup.length > 0;

  /* Quién está dentro del grupo, para el renglón bajo el título. Ver quince
     pares revueltos sin saber de qué marcas son no le sirve a nadie: la entrada
     del menú promete un cajón y hay que decir qué tiene adentro. */
  const contenidoDelGrupo = grupoOtras
    ? marcasVisiblesDelGrupo(grupoOtras)
    : null;
  const incluye = contenidoDelGrupo
    ? [
        ...contenidoDelGrupo.nombres,
        ...(contenidoDelGrupo.restoSinMarca ? ['marcas sueltas'] : []),
      ].join(', ')
    : '';

  const encabezado = grupoActivo
    ? {
        eyebrow,
        title: `${title} · Otras marcas`,
        description: `${pares(results.length)} de marcas con pocas referencias en ${enLaLinea}. Quita el filtro para ver los ${scopedTotal}.`,
      }
    : marcaActiva
      ? {
          eyebrow,
          title: `${title} · ${marcaActiva}`,
          description: `${pares(results.length)} de ${marcaActiva} en ${enLaLinea}. Quita el filtro de marca para ver los ${scopedTotal}.`,
        }
      : { eyebrow, title, description };

  return (
    <>
      <section className="max-w-[1400px] mx-auto px-5 lg:px-8 pt-14 pb-9">
        <SectionHeader
          eyebrow={encabezado.eyebrow}
          title={encabezado.title}
          description={encabezado.description}
        />
        {grupoActivo && incluye && (
          <p className="mt-4 text-[11px] text-marble/40 max-w-xl">
            <span className="uppercase tracking-[0.2em] text-marble/30">
              Incluye
            </span>{' '}
            {incluye}
          </p>
        )}
      </section>

      <FilterRail
        filters={filters}
        onChange={updateFilters}
        onReset={resetFilters}
        brands={availableBrands}
        sizes={availableSizes}
        resultCount={results.length}
        totalCount={scopedTotal}
        activeCount={activeFilterCount}
        lockCategory={Boolean(category)}
      />

      <section className="max-w-[1400px] mx-auto px-5 lg:px-8 py-10">
        {results.length > 0 ? (
          <>
            <p className="text-[10px] uppercase tracking-[0.22em] text-marble/35 mb-5 tabular-nums">
              {results.length} {results.length === 1 ? 'par' : 'pares'}
            </p>
            <Colonnade sneakers={results} />
          </>
        ) : (
          <EmptyState query={filters.searchQuery} onReset={resetFilters} />
        )}
      </section>
    </>
  );
}

export function OriginalsPage() {
  return (
    <CatalogPage
      category="originales"
      eyebrow="Línea verificada"
      title="Originales"
      description="Cada par pasó revisión: costuras, códigos UV, etiqueta interior y peso calibrado. Llegan con comprobante de procedencia."
    />
  );
}

export function SneakersPage() {
  return (
    <CatalogPage
      category="general"
      eyebrow="Línea de uso diario"
      title="Sneakers"
      description="Las siluetas que se están usando ahora, con acabados premium y precio de uso diario. No se venden como originales y lo decimos en cada ficha."
    />
  );
}
