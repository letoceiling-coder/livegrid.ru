/**
 * Pages API — wraps /api/v1/pages/* and /api/v1/admin/pages endpoints.
 */

import api from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PageSection {
  id: number;
  page_id: number;
  type: string;
  content: Record<string, unknown> | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: number;
  title: string;
  slug: string;
  meta_title: string | null;
  meta_description: string | null;
  is_published: boolean;
  sections: PageSection[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedPages {
  data: Page[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface CreatePagePayload {
  title: string;
  slug: string;
  meta_title?: string;
  meta_description?: string;
  is_published?: boolean;
}

export type UpdatePagePayload = Partial<CreatePagePayload>;

// ─── Public API (no auth) ────────────────────────────────────────────────────

/**
 * GET /api/v1/pages/{slug}
 * Fetch a published page by slug.
 */
export const getPublicPage = async (slug: string): Promise<Page> => {
  const { data } = await api.get<Page>(`/pages/${slug}`);
  return data;
};

// ─── Admin API (requires Bearer token) ───────────────────────────────────────

/**
 * GET /api/v1/admin/pages
 */
export const getAdminPages = async (page = 1, perPage = 15): Promise<PaginatedPages> => {
  const { data } = await api.get<PaginatedPages>("/admin/pages", {
    params: { page, per_page: perPage },
  });
  return data;
};

/**
 * GET /api/v1/admin/pages/{id}
 */
export const getAdminPage = async (id: number): Promise<Page> => {
  const { data } = await api.get<Page>(`/admin/pages/${id}`);
  return data;
};

/**
 * POST /api/v1/admin/pages
 */
export const createPage = async (payload: CreatePagePayload): Promise<Page> => {
  const { data } = await api.post<Page>("/admin/pages", payload);
  return data;
};

/**
 * PUT /api/v1/admin/pages/{id}
 */
export const updatePage = async (id: number, payload: UpdatePagePayload): Promise<Page> => {
  const { data } = await api.put<Page>(`/admin/pages/${id}`, payload);
  return data;
};

/**
 * DELETE /api/v1/admin/pages/{id}
 */
export const deletePage = async (id: number): Promise<void> => {
  await api.delete(`/admin/pages/${id}`);
};
