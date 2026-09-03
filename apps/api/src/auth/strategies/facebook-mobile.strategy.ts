import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptionsWithRequest, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { toFacebookOAuthProfile } from './oauth-profile.util';

// Registered as its own valid OAuth redirect URI in the Meta App dashboard,
// separate from FacebookWebStrategy's — has to be a publicly reachable
// address (backend_url), since a phone can't resolve localhost.
@Injectable()
export class FacebookMobileStrategy extends PassportStrategy(Strategy, 'facebook-mobile') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('facebook.appId') || 'not-configured',
      clientSecret: config.get<string>('facebook.appSecret') || 'not-configured',
      callbackURL: `${config.get<string>('backend_url')}/api/auth/facebook/callback/mobile`,
      profileFields: ['id', 'emails', 'name'],
      scope: ['email'],
      passReqToCallback: true,
    } as StrategyOptionsWithRequest);
  }

  validate(req: Request, _accessToken: string, _refreshToken: string, profile: Profile, done: (err: any, user?: any) => void) {
    try {
      done(null, toFacebookOAuthProfile(req, profile));
    } catch (error) {
      done(error);
    }
  }
}
