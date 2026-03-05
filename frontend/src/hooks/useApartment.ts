/**
 * useApartment — single apartment by id.
 * Uses API layer: apartmentsApi.getApartment(id).
 */

import { useQuery } from '@tanstack/react-query';
import { getApartment } from '@/api/apartmentsApi';

export function useApartment(id: string | undefined) {
  const query = useQuery({
    queryKey: ['apartment', id],
    queryFn: () => getApartment(id!),
    enabled: Boolean(id?.trim()),
  });

  return {
    apartment: query.data ?? null,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message ?? 'Ошибка загрузки' : null,
    isError: query.isError,
    refetch: query.refetch,
  };
}
