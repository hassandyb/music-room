import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as authApi from '@/lib/api/auth';
import { startOAuthFlow, type OAuthProvider } from '@/lib/api/oauth';
import type { User } from '@/lib/types';

type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: User }
  | { status: 'unauthenticated' };

type AuthContextValue = {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; username: string; password: string; passwordConfirmation: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  loginWithOAuth: (provider: OAuthProvider) => Promise<void>;
  linkOAuthAccount: (provider: OAuthProvider) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  // The backend never returns a JS-readable token (JWT lives only in an
  // httpOnly cookie), so "is the user logged in" is determined by asking the
  // server, not by reading local storage.
  const refreshSession = useCallback(async () => {
    try {
      const user = await authApi.me();
      setState({ status: 'authenticated', user });
    } catch {
      setState({ status: 'unauthenticated' });
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    // Login already sets the httpOnly cookie server-side as a side effect;
    // the response body's `data` gives us the user directly, no need for a
    // second /auth/me round trip.
    setState({ status: 'authenticated', user: res.data });
  }, []);

  const register = useCallback(
    async (input: { email: string; username: string; password: string; passwordConfirmation: string }) => {
      await authApi.register(input);
      // Registering does not log the user in - it only sends a verification email.
    },
    []
  );

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => null);
    // Always let the user leave, even if the network call failed.
    setState({ status: 'unauthenticated' });
  }, []);

  const loginWithOAuth = useCallback(async (provider: OAuthProvider) => {
    const user = await startOAuthFlow(provider, 'login');
    setState({ status: 'authenticated', user });
  }, []);

  const linkOAuthAccount = useCallback(
    async (provider: OAuthProvider) => {
      await startOAuthFlow(provider, 'link');
      // The link flow logs the same account back in via its own exchange
      // code — refresh from /auth/me instead of trusting that response, so
      // state always reflects exactly what the server has.
      await refreshSession();
    },
    [refreshSession]
  );

  const value = useMemo(
    () => ({ state, login, register, logout, refreshSession, loginWithOAuth, linkOAuthAccount }),
    [state, login, register, logout, refreshSession, loginWithOAuth, linkOAuthAccount]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
