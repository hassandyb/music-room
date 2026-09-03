import type { User } from './types';

// Mirrors the same field app/subscription.tsx already reads to display plan
// status; this is the first place that actually gates behavior on it (see
// playlist.service.ts - invites and joining someone else's playlist require
// the relevant user's subscription to be PREMIUM server-side too, so this is
// a UI nicety that avoids a round-trip, not the enforcement boundary).
export function isPremium(user: User | null | undefined): boolean {
  return user?.profile?.subscription === 'PREMIUM';
}
