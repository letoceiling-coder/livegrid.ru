/**
 * Search API — live search (blocks + apartments).
 * Base: https://livegrid.ru/api/v1 (or VITE_API_URL).
 */

import api from '@/lib/api';

export interface SearchBlock {
  id: string;
  slug: string;
  name: string;
  district: string | null;
  metro: string | null;
  subtitle: string | null;
}

export interface SearchApartment {
  id: string;
  slug: string;
  title: string;
  block_name: string | null;
  price: number | null;
}

export interface SearchResults {
  residential_complexes: SearchBlock[];
  apartments: SearchApartment[];
}

/** GET /api/v1/search?q= — search complexes and apartments */
export async function searchObjects(query: string): Promise<SearchResults> {
  const q = query.trim();
  if (!q) return { residential_complexes: [], apartments: [] };
  const { data } = await api.get<SearchResults>('/search', { params: { q } });
  return data ?? { residential_complexes: [], apartments: [] };
}
