import { ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AuthService } from '../auth.service';

// Handles both GET /auth/google/mobile and GET /auth/google/callback/mobile
// — see GoogleWebAuthGuard for why one guard/strategy pair covers both.
@Injectable()
export class GoogleMobileAuthGuard extends AuthGuard('google-mobile') {
  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (!this.config.get<string>('google.clientId') || !this.config.get<string>('google.clientSecret')) {
      throw new ServiceUnavailableException('Google login is not configured on this server');
    }
    return super.canActivate(context);
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    if (typeof req.query.state === 'string') {
      return { session: false, state: req.query.state };
    }

    // Client-minted id it polls GET /auth/oauth/session/:id with — see
    // OAuthSessionStore.
    const sessionId = typeof req.query.session === 'string' ? req.query.session : undefined;
    const state = this.authService.buildOAuthState({
      intent: 'login',
      platform: 'mobile',
      provider: 'google',
      sessionId,
    });
    return { session: false, state };
  }
}
