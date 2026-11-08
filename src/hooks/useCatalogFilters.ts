import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import type { FilterState, Sneaker } from '../types';
import { DEFAULT_FILTERS } from '../types';

/**
 * Toda la lógica de filtrado y orden del catálogo, fuera de la vista.
 * Incluye los filtros de precio y género que en la versión anterior existían
 * en el tipo pero nunca se aplicaban.
 */
export function useCatalogFilters(sneakers: Sneaker[], seed?: Partial<FilterState>) {
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    ...seed,
  });

  /* La marca suelta y el grupo "Otras marcas" se excluyen, y la regla vive solo
     aquí: si cada pantalla tuviera que acordarse de limpiar el otro campo,
     bastaría un olvido para filtrar por una marca dentro de un grupo que no la
     contiene y dejar el catálogo en cero sin que se entienda por qué. */
  const updateFilters = useCallback((patch: Partial<FilterState>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      if (patch.brand) next.brandGroup = [];
      if (patch.brandGroup?.length) next.brand = '';
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS, ...seed });
  }, [seed]);

  /* Las opciones se calculan sobre la línea que se está viendo, no sobre el
     catálogo entero. En /originales ofrecer Adidas —que solo tiene pares de uso
     diario— llevaba a un filtro sin resultados, y hacía que el conteo del menú
     de marcas no cuadrara con lo que se ve al llegar. */
  const enLinea = useMemo(
    () =>
      filters.category === 'all'
        ? sneakers
        : sneakers.filter((s) => s.category === filters.category),
    [sneakers, filters.category],
  );

  const availableBrands = useMemo(
    () => [...new Set(enLinea.map((s) => s.brand))].sort(),
    [enLinea],
  );

  const availableSizes = useMemo(
    () =>
      [...new Set(enLinea.flatMap((s) => s.sizes ?? []))].sort(
        (a, b) => Number(a) - Number(b),
      ),
    [enLinea],
  );

  /* Los topes del precio salen de la línea que se está viendo, por lo mismo que
     las marcas y las tallas. Estaban fijos en el modelo —de 100.000 a
     3.000.000— y el par más caro del catálogo vale 450.000: de las cincuenta y
     nueve posiciones del deslizador, cincuenta y dos mostraban lo mismo y las
     dos primeras dejaban el catálogo en cero. Se redondea a la decena de mil
     para que los extremos no queden en una cifra rota. */
  const priceBounds = useMemo(() => {
    const precios = enLinea.map((s) => s.price);
    if (!precios.length) return { min: 0, max: DEFAULT_FILTERS.maxPrice };
    return {
      min: Math.floor(Math.min(...precios) / 10_000) * 10_000,
      max: Math.ceil(Math.max(...precios) / 10_000) * 10_000,
    };
  }, [enLinea]);

  /* El texto con el que se busca de verdad va un paso detrás del que se
     escribe: React pinta primero la letra en el campo y filtra después, y si
     llega otra letra a mitad de camino abandona el filtrado viejo. Sin esto,
     cada tecla esperaba a que se rehiciera el catálogo entero y en un celular
     escribir "tenis" se congelaba cuatro segundos. */
  const consulta = useDeferredValue(filters.searchQuery);

  /* El texto donde se busca, armado una sola vez por par y no en cada tecla. */
  const textoDe = useMemo(
    () =>
      new Map(
        sneakers.map((s) => [
          s.id,
          [
            s.name,
            s.brand,
            s.model,
            s.sku,
            s.details.colorway,
            s.description,
            ...(s.sizes ?? []).map(String),
          ]
            .join(' ')
            .toLowerCase(),
        ]),
      ),
    [sneakers],
  );

  const results = useMemo(() => {
    const query = consulta.trim().toLowerCase();

    const matched = sneakers.filter((s) => {
      if (filters.category !== 'all' && s.category !== filters.category) return false;
      if (filters.gender !== 'all' && s.gender !== filters.gender) return false;
      if (filters.brand && s.brand.toLowerCase() !== filters.brand.toLowerCase())
        return false;
      if (
        filters.brandGroup.length &&
        !filters.brandGroup.some((b) => b.toLowerCase() === s.brand.toLowerCase())
      )
        return false;
      if (filters.status !== 'all' && s.status !== filters.status) return false;

      if (filters.size && !s.sizes?.some((sz) => String(sz) === String(filters.size)))
        return false;

      // Filtro de precio — antes declarado pero nunca aplicado.
      if (s.price < filters.minPrice || s.price > filters.maxPrice) return false;

      if (query && !textoDe.get(s.id)?.includes(query)) return false;

      return true;
    });

    const byNewest = (a: Sneaker, b: Sneaker) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

    const discount = (s: Sneaker) =>
      s.originalPrice && s.originalPrice > s.price
        ? (s.originalPrice - s.price) / s.originalPrice
        : 0;

    switch (filters.sortBy) {
      case 'price-asc':
        return [...matched].sort((a, b) => a.price - b.price);
      case 'price-desc':
        return [...matched].sort((a, b) => b.price - a.price);
      case 'newest':
        return [...matched].sort(byNewest);
      case 'discount':
        return [...matched].sort((a, b) => discount(b) - discount(a));
      default:
        return [...matched].sort((a, b) => {
          if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
          return byNewest(a, b);
        });
    }
    // `filters.searchQuery` queda fuera a propósito: el filtro usa `consulta`.
  }, [
    sneakers,
    textoDe,
    consulta,
    filters.category,
    filters.gender,
    filters.brand,
    filters.brandGroup,
    filters.status,
    filters.size,
    filters.minPrice,
    filters.maxPrice,
    filters.sortBy,
  ]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.searchQuery.trim()) n++;
    if (filters.brand) n++;
    if (filters.brandGroup.length) n++;
    if (filters.size) n++;
    if (filters.gender !== 'all') n++;
    if (filters.status !== 'all') n++;
    if (filters.minPrice > priceBounds.min || filters.maxPrice < priceBounds.max)
      n++;
    return n;
  }, [filters, priceBounds]);

  return {
    filters,
    updateFilters,
    resetFilters,
    results,
    availableBrands,
    availableSizes,
    priceBounds,
    activeFilterCount,
  };
}
