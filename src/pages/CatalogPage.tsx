import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SneakerCategory } from '../types';
import { useStore } from '../context/StoreContext';
import { useCatalogFilters } from '../hooks/useCatalogFilters';
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
  useEffect(() => {
    if (!queryParam && !brandParam) return;
    updateFilters({
      ...(queryParam ? { searchQuery: queryParam } : {}),
      ...(brandParam ? { brand: brandParam } : {}),
    });
    setSearchParams({}, { replace: true });
  }, [queryParam, brandParam, updateFilters, setSearchParams]);

  const scopedTotal = category
    ? sneakers.filter((s) => s.category === category).length
    : sneakers.length;

  return (
    <>
      <section className="max-w-[1400px] mx-auto px-5 lg:px-8 pt-14 pb-9">
        <SectionHeader eyebrow={eyebrow} title={title} description={description} />
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
