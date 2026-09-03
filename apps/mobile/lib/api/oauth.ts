import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { apiFetch } from '../api-client';
import { getBackendUrl } from '../api-config';
import type { User } from '../types';

export type OAuthProvider = 'google' | 'facebook';
export type OAuthIntent = 'login' | 'link';

type PollResult =
  | { status: 'pending' }
  | { status: 'error'; message: string }
  | { status: 'done'; data: User };

// "Linking" a provider to an already-authenticated account requires the
// callback to know who the current user is, but the OAuth round trip happens
// in a browser tab whose cookies aren't shared with the app's own fetch — so
// instead we mint a signed state token here (over the app's own
// authenticated fetch, which does have the session cookie) and hand it to
// the browser leg as a plain `state` query param.
async function fetchLinkState(provider: OAuthProvider, sessionId: string): Promise<string> {
  const res = (await apiFetch(
    `/api/auth/oauth/link-state?provider=${provider}&session=${sessionId}`
  )) as { state: string };
  return res.state;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;

// Neither result is meaningfully different from "still waiting" as far as
// this loop is concerned, so a network hiccup mid-flow doesn't abort the
// sign-in — it just tries again next tick, same as if the callback hadn't
// landed yet.
async function pollForResult(sessionId: string): Promise<User> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    const result = (await apiFetch(`/api/auth/oauth/session/${sessionId}`).catch(() => null)) as PollResult | null;

    if (result?.status === 'done') return result.data;
    if (result?.status === 'error') throw new Error(result.message);
  }

  throw new Error('Sign-in timed out. Please try again.');
}

// Expo Go has no fixed custom URL scheme the way a standalone/dev-client
// build does (app.json's `scheme` only applies to those), so there's no
// reliable deep link to hand the provider to redirect back to — Expo Go's
// own `exp://` proxy URL changes with the dev server's LAN IP and, even when
// it doesn't, catching that redirect via openAuthSessionAsync has proven
// unreliable across devices. So instead of waiting to be redirected back
// into the app, we open a plain browser tab, mint a random session id the
// backend has no way to guess, and poll for it to resolve — the tab stays
// open showing "you can return to the app" (auto-closed on iOS only; see
// expo-web-browser's dismissBrowser docs) while polling happens entirely in
// the background, since neither Custom Tabs nor SFSafariViewController
// actually suspend the app that opened them.
export async function startOAuthFlow(provider: OAuthProvider, intent: OAuthIntent): Promise<User> {
  const baseUrl = await getBackendUrl();
  const sessionId = Crypto.randomUUID();

  const params = new URLSearchParams({ session: sessionId });
  if (intent === 'link') {
    params.set('state', await fetchLinkState(provider, sessionId));
  }

  // Dedicated /mobile route/callback (see auth.controller.ts and the
  // *-mobile.strategy.ts files) — registered as its own authorized redirect
  // URI with each provider, separate from the web app's.
  const startUrl = `${baseUrl}/api/auth/${provider}/mobile?${params.toString()}`;
  await WebBrowser.openBrowserAsync(startUrl);

  try {
    return await pollForResult(sessionId);
  } finally {
    if (Platform.OS === 'ios') {
      WebBrowser.dismissBrowser().catch(() => null);
    }
  }
}
