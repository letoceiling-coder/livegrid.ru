import { useEffect, useRef, useState } from 'react';
import { getApartment } from '@/api/apartmentsApi';
import { type ApartmentListItem } from '@/types/apartment';

// ── Result shape ──────────────────────────────────────────────────────────────

export interface UseApartmentDetailResult {
  apartment: ApartmentListItem | null;
  loading: boolean;
  error: string | null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetches a single apartment detail from GET /api/v1/apartments/{id}.
 *
 * @param id  Apartment ID (UUID string)
 */
export function useApartmentDetail(id: string | undefined): UseApartmentDetailResult {
  const [apartment, setApartment] = useState<ApartmentListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track in-flight request for cancellation
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('Apartment ID is required');
      return;
    }

    // Cancel previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    getApartment(id!)
      .then((apartmentData) => setApartment(apartmentData))
      .catch((err) => {
        // Ignore AbortError from cancelled requests
        if (err?.code === 'ERR_CANCELED' || err?.name === 'AbortError') return;
        const msg = err?.response?.data?.message ?? 'Ошибка загрузки квартиры';
        setError(msg);
        setApartment(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  return { apartment, loading, error };
}
