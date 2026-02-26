/**
 * API client — axios instance pointed at the Laravel backend.
 *
 * Base URL is set via VITE_API_URL env variable.
 * Falls back to /api/v1 (same-origin, works behind Nginx proxy).
 *
 * Usage:
 *   import api from '@/lib/api';
 *   const { data } = await api.get('/pages/home');
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
