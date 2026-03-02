import { useApartments } from './useApartments';

export function useStartSales() {
  console.log('[useStartSales] Hook called');
  
  const { items: properties, loading, error } = useApartments(
    { is_start_sales: true },
    1,
    8
  );

  console.log('[useStartSales] Result:', { count: properties?.length, loading, error });

  return {
    properties: properties || [],
    loading,
    error
  };
}
