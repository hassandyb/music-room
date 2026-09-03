import { apiFetch } from '../api-client';
import type { User } from '../types';

export function register(input: { email: string; username: string; password: string; passwordConfirmation: string }) {
  return apiFetch('/api/auth/register', { method: 'POST', body: input }) as Promise<{ message: string }>;
}

export function login(input: { email: string; password: string }) {
  return apiFetch('/api/auth/login', { method: 'POST', body: input }) as Promise<{ message: string; data: User }>;
}

export function logout() {
  return apiFetch('/api/auth/logout', { method: 'POST' }) as Promise<{ message: string }>;
}

export function me() {
  return apiFetch('/api/auth/me') as Promise<User>;
}

export function forgotPassword(email: string) {
  return apiFetch('/api/auth/forgot-password', { method: 'POST', body: { email } }) as Promise<{ message: string }>;
}

export function resetPassword(input: { password: string; confirmPassword: string; token: string }) {
  return apiFetch('/api/auth/reset-password', { method: 'POST', body: input }) as Promise<{ message: string }>;
}

export function verifyEmail(token: string) {
  return apiFetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`) as Promise<User>;
}

// Google/Facebook sign-in and account-linking go through lib/api/oauth.ts's
// startOAuthFlow instead of a plain apiFetch call — the flow needs a system
// browser round trip, not just a request/response.
