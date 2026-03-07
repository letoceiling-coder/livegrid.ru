/**
 * Authentication API — wraps /api/v1/auth/* endpoints.
 */

import api, { setStoredToken, clearStoredToken, getStoredToken } from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
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
 * Register -> creates user and stores token.
 */
export const register = async (payload: RegisterPayload): Promise<AuthUser> => {
  const { data } = await api.post<LoginResponse>("/auth/register", payload);
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
 * Request password reset link.
 */
export const forgotPassword = async (payload: ForgotPasswordPayload): Promise<void> => {
  await api.post("/auth/forgot-password", payload);
};

/**
 * Reset password by token.
 */
export const resetPassword = async (payload: ResetPasswordPayload): Promise<void> => {
  await api.post("/auth/reset-password", payload);
};

/**
 * Check if user is authenticated (token exists in storage).
 */
export const isAuthenticated = (): boolean => Boolean(getStoredToken());
