import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface NewsItem {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  image_url: string | null;
  excerpt: string | null;
  published_at: string;
}

export function useLatestNews(limit: number = 6) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ data: NewsItem[] }>('/news', {
        params: {
          per_page: limit,
          page: 1,
        },
      })
      .then((res) => {
        setNews(res.data.data || []);
      })
      .catch((err) => {
        console.error('Failed to fetch news:', err);
        setError(err?.response?.data?.message || 'Ошибка загрузки новостей');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [limit]);

  return { news, loading, error };
}
