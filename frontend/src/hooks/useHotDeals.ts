import { useApartments } from './useApartments';

export function useHotDeals() {
  console.log('[useHotDeals] Hook called');
  
  const { items: properties, loading, error } = useApartments(
    { is_hot: true },
    1,
    8
  );

  console.log('[useHotDeals] Result:', { count: properties?.length, loading, error });

  return {
    properties: properties || [],
    loading,
    error
  };
}
