/**
 * useCatalogBlocks — paginated blocks (ЖК) for catalog page.
 * Uses API layer: blocksApi.getBlocks(params).
 */

import { useQuery } from '@tanstack/react-query';
import { getBlocks, type BlockListParams } from '@/api/blocksApi';

export function useCatalogBlocks(params: BlockListParams = {}, page = 1, perPage = 20) {
  const query = useQuery({
    queryKey: ['catalog-blocks', JSON.stringify(params), page, perPage],
    queryFn: () => getBlocks({ ...params, page, per_page: perPage }),
  });

  const data = query.data;
  return {
    blocks: data?.data ?? [],
    meta: data?.meta ?? null,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message ?? 'Ошибка загрузки' : null,
    isError: query.isError,
    refetch: query.refetch,
  };
}
