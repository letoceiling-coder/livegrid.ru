import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { type ApartmentListItem } from '@/types/apartment';
import { type PropertyData } from '@/components/PropertyCard';
import { formatPrice, formatArea } from '@/lib/format';

// ── Result shape ──────────────────────────────────────────────────────────────

export interface UseSimilarApartmentsResult {
  apartments: PropertyData[];
  loading: boolean;
  error: string | null;
}

// ── Transform: API item → PropertyData ───────────────────────────────────────

/**
 * Maps a single ApartmentListItem from the API to the PropertyData shape
 * expected by PropertyCard (same as in useApartments hook).
 */
function toPropertyData(apt: ApartmentListItem): PropertyData {
  // Resolve room label: prefer API value, fall back to numeric derivation
  const roomLabel =
    apt.room_label ??
    (apt.room === 0 ? 'Студия' : apt.room != null ? `${apt.room}-комн.` : '—');

  const areaTotal = apt.area?.total ?? null;

  return {
    image: apt.plan_url ?? '',
    title: `${roomLabel} · ${formatArea(areaTotal)}`,
    price: formatPrice(apt.price),
    address: apt.block?.name ?? '—',
    area: formatArea(areaTotal),
    rooms: roomLabel,
    slug: apt.id,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetches similar apartments from GET /api/v1/apartments/{id}/similar.
 *
 * @param id  Apartment ID (UUID string) - similar apartments will be found for this one
 */
export function useSimilarApartments(id: string | undefined): UseSimilarApartmentsResult {
  const [apartments, setApartments] = useState<PropertyData[]>([]);
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

    api
      .get<{ data: ApartmentListItem[] }>(`/apartments/${id}/similar`, {
        signal: controller.signal,
      })
      .then((res) => {
        // The axios interceptor unwraps {success: true, data: ...} to just data
        // Similar endpoint returns {data: [...]} which becomes res.data = {data: [...]}
        // OR if interceptor unwraps further, res.data = [...]
        const data = res.data as unknown as { data: ApartmentListItem[] } | ApartmentListItem[];
        const rawItems = Array.isArray(data) ? data : (data as { data: ApartmentListItem[] }).data ?? [];

        setApartments(rawItems.map(toPropertyData));
      })
      .catch((err) => {
        // Ignore AbortError from cancelled requests
        if (err?.code === 'ERR_CANCELED' || err?.name === 'AbortError') return;
        const msg = err?.response?.data?.message ?? 'Ошибка загрузки похожих квартир';
        setError(msg);
        setApartments([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  return { apartments, loading, error };
}
