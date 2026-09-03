import { ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AuthService } from '../auth.service';

// Handles both GET /auth/facebook/web and GET /auth/facebook/callback/web —
// see GoogleWebAuthGuard for why one guard/strategy pair covers both.
@Injectable()
export class FacebookWebAuthGuard extends AuthGuard('facebook-web') {
  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (!this.config.get<string>('facebook.appId') || !this.config.get<string>('facebook.appSecret')) {
      throw new ServiceUnavailableException('Facebook login is not configured on this server');
    }
    return super.canActivate(context);
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    if (typeof req.query.state === 'string') {
      return { session: false, state: req.query.state };
    }

    const state = this.authService.buildOAuthState({
      intent: 'login',
      platform: 'web',
      provider: 'facebook',
    });
    return { session: false, state };
  }
}
