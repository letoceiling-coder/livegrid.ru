import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface PlatformStats {
  total_objects: number;
  total_users: number;
  total_regions: number;
  years_on_market: number;
}

/**
 * Hook для загрузки статистики платформы.
 * Используется в секции AboutPlatform.
 * 
 * API: GET /api/v1/stats/platform
 */
export function usePlatformStats() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<PlatformStats>('/stats/platform')
      .then((res) => {
        setStats(res.data);
      })
      .catch((err) => {
        const msg = err?.response?.data?.message ?? 'Ошибка загрузки статистики';
        setError(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { stats, loading, error };
}
