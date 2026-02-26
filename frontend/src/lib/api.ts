/**
 * API client — axios instance pointed at the Laravel backend.
 *
 * ## Configuration
 *
 * Base URL читается из `VITE_API_URL` (бакается в бандл при сборке).
 * В production: `https://livegrid.ru/api/v1`
 * В development: `http://localhost:8000/api/v1`
 * Fallback: `/api/v1` (same-origin, работает через Nginx proxy).
 *
 * ## Request interceptor
 *
 * Автоматически добавляет `Authorization: Bearer <token>` если токен
 * присутствует в `localStorage` (ключ `livegrid_api_token`).
 *
 * ## Response interceptor
 *
 * Laravel оборачивает ответы в конверт `{ success, data, message }`.
 * Interceptor автоматически извлекает `data`, чтобы вызывающий код
 * получал данные напрямую без вложенности.
 *
 * ## 401 handling
 *
 * При получении 401 токен очищается из localStorage.
 * Если пользователь находился в `/admin/*`, перенаправляется на `/login`.
 *
 * ## Usage
 *
 * ```ts
 * import api from '@/lib/api';
 *
 * // GET: данные уже unwrapped из { success, data: ... }
 * const { data: page } = await api.get('/pages/home');
 *
 * // POST
 * const { data: newPage } = await api.post('/admin/pages', payload);
 *
 * // Error handling
 * try {
 *   await api.post('/auth/login', creds);
 * } catch (e: AxiosError) {
 *   console.error(e.response?.data?.message); // "The provided credentials are incorrect."
 * }
 * ```
 *
 * @module api
 */

import axios, { type AxiosResponse } from "axios";

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

// ─── Axios instance ───────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: false, // Token auth — no cookies needed
});

// ─── Request interceptor: inject Bearer token ────────────────────────────────

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor: unwrap success.data ───────────────────────────────

api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Backend returns { success: true, data: ... }
    // Unwrap so callers get `data` directly
    if (response.data && typeof response.data === "object" && "success" in response.data) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  (error) => {
    // 401 → clear stored token and redirect to login
    if (error.response?.status === 401) {
      clearStoredToken();
      if (window.location.pathname.startsWith("/admin")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ─── Token helpers ────────────────────────────────────────────────────────────

const TOKEN_KEY = "livegrid_api_token";

export const getStoredToken = (): string | null =>
  localStorage.getItem(TOKEN_KEY);

export const setStoredToken = (token: string): void =>
  localStorage.setItem(TOKEN_KEY, token);

export const clearStoredToken = (): void =>
  localStorage.removeItem(TOKEN_KEY);

// ─── Typed API helpers ────────────────────────────────────────────────────────

/** Backend standard response wrapper */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

/** API error shape */
export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export default api;
