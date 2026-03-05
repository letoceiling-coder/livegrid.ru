/**
 * useSearch — live search (debounced).
 * Uses API layer: searchApi.searchObjects(query).
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchObjects } from '@/api/searchApi';

const DEBOUNCE_MS = 400;

export function useSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const queryResult = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchObjects(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  const results = queryResult.data ?? null;
  const loading = queryResult.isLoading;
  const error = queryResult.error ? (queryResult.error as Error).message ?? 'Ошибка поиска' : null;

  return {
    results,
    loading,
    error,
    isEmpty: Boolean(debouncedQuery.length >= 2 && !loading && results && results.residential_complexes.length === 0 && results.apartments.length === 0),
  };
}
