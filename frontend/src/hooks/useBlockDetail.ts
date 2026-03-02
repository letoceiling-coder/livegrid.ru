import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
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

  // Track in-flight request for cancellation
  const abortRef = useRef<AbortController | null>(null);

  // Extract ID from slug if needed
  // Slug format: "name-with-dashes-{24-char-hex-id}"
  const extractId = (input: string): string => {
    // If input is already a 24-char hex ID, return as-is
    if (/^[a-f0-9]{24}$/i.test(input)) {
      return input;
    }
    // Extract last 24 characters (the ID part from slug)
    const parts = input.split('-');
    const lastPart = parts[parts.length - 1];
    if (/^[a-f0-9]{24}$/i.test(lastPart)) {
      return lastPart;
    }
    // Fallback: try last 24 chars of the entire string
    return input.slice(-24);
  };

  useEffect(() => {
    if (!slugOrId) {
      setLoading(false);
      setError('Block ID is required');
      return;
    }

    const blockId = extractId(slugOrId);

    // Cancel previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    api
      .get<{ data: BlockDetail }>(`/blocks/${blockId}`, {
        signal: controller.signal,
      })
      .then((res) => {
        // The axios interceptor may unwrap responses
        const data = res.data as unknown as { data: BlockDetail } | BlockDetail;
        const blockData = 'data' in data ? data.data : data;
        setBlock(blockData as BlockDetail);
      })
      .catch((err) => {
        // Ignore AbortError from cancelled requests
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
