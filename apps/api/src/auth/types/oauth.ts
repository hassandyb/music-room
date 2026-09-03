export type OAuthProvider = 'google' | 'facebook';
export type OAuthIntent = 'login' | 'link';
export type OAuthPlatform = 'web' | 'mobile';

export interface OAuthStatePayload {
  purpose: 'oauth-state';
  intent: OAuthIntent;
  platform: OAuthPlatform;
  provider: OAuthProvider;
  sub?: string;
  // Mobile only: a random id the client mints and polls GET
  // /auth/oauth/session/:id with (see OAuthSessionStore) instead of waiting
  // to be deep-linked back into Expo Go, which has no fixed URL scheme and
  // proved unreliable across devices/networks.
  sessionId?: string;
}

export interface OAuthProfile {
  providerId: string;
  email: string;
  state?: string;
}
