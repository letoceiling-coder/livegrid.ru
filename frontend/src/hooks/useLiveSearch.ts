import { useEffect, useState, useRef } from 'react';
import { searchObjects, type SearchResults } from '@/api/searchApi';

export type { SearchBlock, SearchApartment, SearchResults } from '@/api/searchApi';

export function useLiveSearch(query: string) {
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const prevQueryRef = useRef('');

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      prevQueryRef.current = '';
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }
    if (q === prevQueryRef.current) return;
    prevQueryRef.current = q;

    const t = setTimeout(() => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      setError(null);

      searchObjects(q)
        .then((data) => setResults(data ?? { residential_complexes: [], apartments: [] }))
        .catch((err) => {
          if (err.name === 'CanceledError' || err.name === 'AbortError') return;
          setError(err?.response?.data?.message ?? 'Ошибка поиска');
          setResults(null);
        })
        .finally(() => setLoading(false));
    }, 400);

    return () => {
      clearTimeout(t);
      abortRef.current?.abort();
    };
  }, [query]);

  return { results, loading, error };
}
