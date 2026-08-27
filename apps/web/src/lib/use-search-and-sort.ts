import { useEffect, useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface FilterOption {
  value: string;
  count: number;
}

const DEFAULT_PAGE_SIZE = 20;

/**
 * useSearchAndSort — filtro (texto + checklist por columna) + orden +
 * paginación, todo en el cliente (las tablas hoy traen la lista completa
 * sin paginación del backend). `getSearchText` arma el texto contra el que
 * se compara el buscador global; `sortAccessors` es un mapa columna->valor
 * comparable; `filterAccessors` (opcional) es un mapa columna->valor exacto
 * para armar el checklist de esa columna — solo se pasa para columnas
 * categóricas (Tipo, Estado, Sucursal...), nunca para texto libre.
 */
export function useSearchAndSort<T>(
  items: T[] | undefined,
  getSearchText: (item: T) => string,
  sortAccessors: Record<string, (item: T) => string | number>,
  defaultSortKey: string,
  filterAccessors: Record<string, (item: T) => string> = {},
  defaultSortDirection: SortDirection = 'asc',
) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Valores distintos por columna filtrable, calculados sobre la lista
  // COMPLETA (no la ya filtrada) — si no, el checklist se iría vaciando a
  // sí mismo a medida que se marcan opciones.
  const filterOptions = useMemo(() => {
    const options: Record<string, FilterOption[]> = {};
    for (const [column, accessor] of Object.entries(filterAccessors)) {
      const counts = new Map<string, number>();
      for (const item of items ?? []) {
        const value = accessor(item);
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      options[column] = [...counts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value.localeCompare(b.value, 'es'));
    }
    return options;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const toggleFilterValue = (column: string, value: string) => {
    setFilters((prev) => {
      const current = new Set(prev[column] ?? []);
      if (current.has(value)) current.delete(value);
      else current.add(value);
      const next = { ...prev };
      if (current.size === 0) delete next[column];
      else next[column] = current;
      return next;
    });
  };

  const clearFilter = (column: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[column];
      return next;
    });
  };

  const result = useMemo(() => {
    let list = items ?? [];

    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter((item) => getSearchText(item).toLowerCase().includes(term));
    }

    for (const [column, values] of Object.entries(filters)) {
      const accessor = filterAccessors[column];
      if (accessor && values.size > 0) {
        list = list.filter((item) => values.has(accessor(item)));
      }
    }

    const accessor = sortAccessors[sortKey];
    if (accessor) {
      list = [...list].sort((a, b) => {
        const av = accessor(a);
        const bv = accessor(b);
        const cmp =
          typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av).localeCompare(String(bv), 'es', { sensitivity: 'base' });
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, search, filters, sortKey, sortDirection]);

  // Volver a la página 1 cada vez que cambia lo que se está viendo — si no,
  // se puede quedar "atascado" viendo una página que ya no existe.
  useEffect(() => {
    setPage(1);
  }, [search, filters, sortKey, sortDirection, pageSize]);

  const totalPages = Math.max(1, Math.ceil(result.length / pageSize));

  const paginatedResult = useMemo(() => {
    const start = (page - 1) * pageSize;
    return result.slice(start, start + pageSize);
  }, [result, page, pageSize]);

  const toggleSort = (key: string) => {
    if (key === sortKey) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return {
    search,
    setSearch,
    sortKey,
    sortDirection,
    toggleSort,
    filters,
    filterOptions,
    toggleFilterValue,
    clearFilter,
    result,
    page,
    setPage,
    totalPages,
    pageSize,
    setPageSize,
    paginatedResult,
  };
}
