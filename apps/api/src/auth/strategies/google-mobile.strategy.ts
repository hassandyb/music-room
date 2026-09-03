import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptionsWithRequest, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { VerifyCallback } from 'passport-oauth2';
import { toGoogleOAuthProfile } from './oauth-profile.util';

// Registered as its own authorized redirect URI in Google Cloud Console,
// separate from GoogleWebStrategy's — has to be a publicly reachable
// address (backend_url), since a phone can't resolve localhost.
@Injectable()
export class GoogleMobileStrategy extends PassportStrategy(Strategy, 'google-mobile') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('google.clientId') || 'not-configured',
      clientSecret: config.get<string>('google.clientSecret') || 'not-configured',
      callbackURL: `${config.get<string>('backend_url')}/api/auth/google/callback/mobile`,
      scope: ['email', 'profile'],
      passReqToCallback: true,
    } as StrategyOptionsWithRequest);
  }

  validate(req: Request, _accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) {
    try {
      done(null, toGoogleOAuthProfile(req, profile));
    } catch (error) {
      done(error as Error);
    }
  }
}
