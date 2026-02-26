/**
 * Authentication API — wraps /api/v1/auth/* endpoints.
 */

import api, { setStoredToken, clearStoredToken, getStoredToken } from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
}

// ─── Auth API ────────────────────────────────────────────────────────────────

/**
 * Login → stores Bearer token in localStorage.
 */
export const login = async (credentials: LoginCredentials): Promise<AuthUser> => {
  const { data } = await api.post<LoginResponse>("/auth/login", credentials);
  setStoredToken(data.token);
  return data.user;
};

/**
 * Logout → revokes token on server and clears localStorage.
 */
export const logout = async (): Promise<void> => {
  try {
    await api.post("/auth/logout");
  } finally {
    clearStoredToken();
  }
};

/**
 * Get currently authenticated user (requires valid token).
 */
export const getMe = async (): Promise<AuthUser> => {
  const { data } = await api.get<AuthUser>("/auth/me");
  return data;
};

/**
 * Check if user is authenticated (token exists in storage).
 */
export const isAuthenticated = (): boolean => Boolean(getStoredToken());
