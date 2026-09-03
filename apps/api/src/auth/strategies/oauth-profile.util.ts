import type { Request } from 'express';
import type { Profile as GoogleProfile } from 'passport-google-oauth20';
import type { Profile as FacebookProfile } from 'passport-facebook';
import type { OAuthProfile } from '../types/oauth';

// Shared by the web and mobile variants of each provider's strategy — they
// only differ in clientID/callbackURL, never in how a provider profile maps
// to our own OAuthProfile shape.
export function toGoogleOAuthProfile(req: Request, profile: GoogleProfile): OAuthProfile {
  const email = profile.emails?.[0]?.value;
  if (!email) {
    throw new Error('Google account has no verified email');
  }

  return {
    providerId: profile.id,
    email,
    state: typeof req.query.state === 'string' ? req.query.state : undefined,
  };
}

export function toFacebookOAuthProfile(req: Request, profile: FacebookProfile): OAuthProfile {
  const email = profile.emails?.[0]?.value;
  if (!email) {
    throw new Error(
      'Facebook account has no email — the account may lack a verified email or the "email" permission was declined',
    );
  }

  return {
    providerId: profile.id,
    email,
    state: typeof req.query.state === 'string' ? req.query.state : undefined,
  };
}
