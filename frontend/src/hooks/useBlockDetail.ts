import { useEffect, useRef, useState } from 'react';
import { getComplex } from '@/api/blocksApi';
import { type BlockDetail } from '@/types/block';

// ── Result shape ──────────────────────────────────────────────────────────────

export interface UseBlockDetailResult {
  block: BlockDetail | null;
  loading: boolean;
  error: string | null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetches a single block detail from GET /api/v1/blocks/{id}.
 *
 * @param slugOrId  Block slug (e.g., "symphony-34-60f7efce519291389ab3bbc0") or ID (24 hex chars)
 */
export function useBlockDetail(slugOrId: string | undefined): UseBlockDetailResult {
  const [block, setBlock] = useState<BlockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!slugOrId) {
      setLoading(false);
      setError('Block ID is required');
      return;
    }

    // Cancel previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    getComplex(slugOrId, controller.signal)
      .then((blockData) => setBlock(blockData))
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'AbortError') return;
        const msg = err?.response?.data?.message ?? 'Ошибка загрузки объекта';
        setError(msg);
        setBlock(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [slugOrId]);

  return { block, loading, error };
}
