import { useApartments } from './useApartments';

export function useHotDeals() {
  const { items: properties, loading, error } = useApartments(
    { is_hot: true },
    1,
    8
  );

  return {
    properties: properties || [],
    loading,
    error
  };
}
