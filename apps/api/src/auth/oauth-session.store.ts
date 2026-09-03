import { Injectable } from '@nestjs/common';

export type OAuthSessionResult =
  | { status: 'pending' }
  | { status: 'done'; userId: string }
  | { status: 'error'; message: string };

// Backs the mobile OAuth polling flow (see oauth.ts on the client): the
// provider callback resolves a session by id here instead of redirecting
// back into the app, and the client polls for that result. Keyed by a
// random id the client mints itself and never shares with anyone but us, so
// knowing the id is itself the authorization to claim the result — no extra
// signing needed. In-memory and single-instance is fine: this is a
// short-lived (minutes), dev-scale handoff, not durable state.
@Injectable()
export class OAuthSessionStore {
  private readonly sessions = new Map<string, { result: OAuthSessionResult; expiresAt: number }>();
  private readonly ttlMs = 5 * 60 * 1000;

  resolve(id: string, result: OAuthSessionResult) {
    this.sessions.set(id, { result, expiresAt: Date.now() + this.ttlMs });
  }

  // One-shot: a 'done'/'error' result is consumed on read so a replayed poll
  // can't re-trigger cookie issuance. An id nobody has resolved yet (or one
  // that already expired) reads as 'pending' — indistinguishable from
  // "still waiting", which is fine since the client applies its own timeout.
  take(id: string): OAuthSessionResult {
    const entry = this.sessions.get(id);
    if (!entry || entry.expiresAt < Date.now()) {
      this.sessions.delete(id);
      return { status: 'pending' };
    }
    if (entry.result.status !== 'pending') {
      this.sessions.delete(id);
    }
    return entry.result;
  }
}
