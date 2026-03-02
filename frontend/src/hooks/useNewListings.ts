import { useApartments } from './useApartments';

/**
 * Hook для загрузки последних 8 новых объявлений (квартир).
 * Используется в секции NewListings на главной странице.
 * 
 * Без сортировки — используются данные в порядке, возвращаемом API
 * Лимит: 8 объектов
 */
export function useNewListings() {
  console.log('[useNewListings] Hook called');
  
  const { items: properties, loading, error } = useApartments(
    {}, // Без фильтров и сортировки
    1, 
    8
  );

  console.log('[useNewListings] Result:', { count: properties?.length, loading, error });

  // items уже трансформированы в PropertyData внутри useApartments
  return { 
    properties: properties || [], // Гарантируем массив
    loading, 
    error 
  };
}
