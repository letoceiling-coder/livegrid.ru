/**
 * useComplexApartments — apartments in a block.
 * Uses API layer: blocksApi.getComplexApartments(slug, params).
 */

import { useQuery } from '@tanstack/react-query';
import { getComplexApartments, type BlockApartmentsParams } from '@/api/blocksApi';

export function useComplexApartments(
  slug: string | undefined,
  params: BlockApartmentsParams = {},
  page = 1,
  perPage = 20
) {
  const query = useQuery({
    queryKey: ['complex-apartments', slug, JSON.stringify(params), page, perPage],
    queryFn: () => getComplexApartments(slug!, { ...params, page, per_page: perPage }),
    enabled: Boolean(slug?.trim()),
  });

  const data = query.data;
  return {
    apartments: data?.data ?? [],
    meta: data?.meta ?? null,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message ?? 'Ошибка загрузки' : null,
    isError: query.isError,
    refetch: query.refetch,
  };
}
