import { ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AuthService } from '../auth.service';

// Handles both GET /auth/google/web (redirects to Google) and GET
// /auth/google/callback/web (Google redirects back here with ?code=) —
// passport tells these apart internally by the presence of req.query.code,
// so one guard/strategy pair covers both routes.
@Injectable()
export class GoogleWebAuthGuard extends AuthGuard('google-web') {
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
    // On the callback leg Google already echoes our state back in the query
    // string, so this only actually builds a fresh one on the initiating
    // request.
    if (typeof req.query.state === 'string') {
      return { session: false, state: req.query.state };
    }

    const state = this.authService.buildOAuthState({
      intent: 'login',
      platform: 'web',
      provider: 'google',
    });
    return { session: false, state };
  }
}
