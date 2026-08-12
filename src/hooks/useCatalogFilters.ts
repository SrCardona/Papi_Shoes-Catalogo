import { useMemo, useState, useCallback } from 'react';
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

  const updateFilters = useCallback((patch: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS, ...seed });
  }, [seed]);

  const availableBrands = useMemo(
    () => [...new Set(sneakers.map((s) => s.brand))].sort(),
    [sneakers],
  );

  const availableSizes = useMemo(
    () =>
      [...new Set(sneakers.flatMap((s) => s.sizes ?? []))].sort(
        (a, b) => Number(a) - Number(b),
      ),
    [sneakers],
  );

  const results = useMemo(() => {
    const query = filters.searchQuery.trim().toLowerCase();

    const matched = sneakers.filter((s) => {
      if (filters.category !== 'all' && s.category !== filters.category) return false;
      if (filters.gender !== 'all' && s.gender !== filters.gender) return false;
      if (filters.brand && s.brand.toLowerCase() !== filters.brand.toLowerCase())
        return false;
      if (filters.status !== 'all' && s.status !== filters.status) return false;

      if (filters.size && !s.sizes?.some((sz) => String(sz) === String(filters.size)))
        return false;

      // Filtro de precio — antes declarado pero nunca aplicado.
      if (s.price < filters.minPrice || s.price > filters.maxPrice) return false;

      if (query) {
        const haystack = [
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
        if (!haystack.includes(query)) return false;
      }

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
  }, [sneakers, filters]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.searchQuery.trim()) n++;
    if (filters.brand) n++;
    if (filters.size) n++;
    if (filters.gender !== 'all') n++;
    if (filters.status !== 'all') n++;
    if (filters.minPrice > 0 || filters.maxPrice < DEFAULT_FILTERS.maxPrice) n++;
    return n;
  }, [filters]);

  return {
    filters,
    updateFilters,
    resetFilters,
    results,
    availableBrands,
    availableSizes,
    activeFilterCount,
  };
}
