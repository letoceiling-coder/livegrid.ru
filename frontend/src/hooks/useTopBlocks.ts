import { useBlocks } from './useBlocks';

/**
 * Hook для загрузки топ-8 ЖК.
 * Используется в секции CatalogZhk на главной странице.
 * 
 * Без сортировки — используются данные в порядке, возвращаемом API
 * Лимит: 8 объектов
 * 
 * Возвращает blocks уже трансформированные в ZhkData формат
 * (трансформация происходит внутри useBlocks)
 */
export function useTopBlocks() {
  const { blocks, rawBlocks, loading, error } = useBlocks(
    {}, // Без фильтров
    1, 
    8
  );

  return { 
    blocks,      // ZhkData[] — готовые данные для ZhkCard
    rawBlocks,   // BlockListItem[] — сырые данные из API
    loading, 
    error 
  };
}
