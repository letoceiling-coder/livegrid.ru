/**
 * useComplex — single block (ЖК) by slug.
 * Uses API layer: blocksApi.getComplex(slug).
 */

import { useQuery } from '@tanstack/react-query';
import { getComplex } from '@/api/blocksApi';

export function useComplex(slug: string | undefined) {
  const query = useQuery({
    queryKey: ['complex', slug],
    queryFn: () => getComplex(slug!),
    enabled: Boolean(slug?.trim()),
  });

  return {
    complex: query.data ?? null,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message ?? 'Ошибка загрузки' : null,
    isError: query.isError,
    refetch: query.refetch,
  };
}
