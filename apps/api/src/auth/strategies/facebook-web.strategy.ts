import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptionsWithRequest, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { toFacebookOAuthProfile } from './oauth-profile.util';

// Registered as its own valid OAuth redirect URI in the Meta App dashboard,
// separate from FacebookMobileStrategy's — see config/configuration.ts's
// web_backend_url for why web and mobile can't share one callback URL.
@Injectable()
export class FacebookWebStrategy extends PassportStrategy(Strategy, 'facebook-web') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('facebook.appId') || 'not-configured',
      clientSecret: config.get<string>('facebook.appSecret') || 'not-configured',
      callbackURL: `${config.get<string>('web_backend_url')}/api/auth/facebook/callback/web`,
      profileFields: ['id', 'emails', 'name'],
      // profileFields only says which fields to request from the Graph API —
      // without this scope, Facebook never grants email access in the first
      // place, so the field comes back empty regardless of profileFields.
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
