import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { Response } from 'express';
import { ForgetPasswordDto } from './dto/forget-password.dto';
import { generateToken } from '../../common/utils/utils';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { OAuthSessionStore } from './oauth-session.store';
import type {
  OAuthPlatform,
  OAuthProfile,
  OAuthProvider,
  OAuthStatePayload,
} from './types/oauth';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private mailService: MailService,
    private oauthSessions: OAuthSessionStore,
  ) { }

  async register(createUserDto: CreateUserDto) {

    try {
      const user = await this.userService.createUser(createUserDto);

      await this.mailService.sendConfirmationEmail(
        user.email,
        user.username,
        user.emailVerificationToken ?? '',
      );
    } catch (error) {
      throw new UnauthorizedException(error);
    }

    return {
      message: 'User created successfully',
    };
  }

  async login(LoginDto: LoginDto, res: Response) {
    const { email, password } = LoginDto;
    const user = await this.userService.findUserByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }


    if (!user.isActivated) {
      throw new UnauthorizedException('Please verify your email first');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActivated) {
      throw new UnauthorizedException('Please verify your email first');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    res.cookie('access_token', token, {
      httpOnly: true,
      path: '/',
      secure: true,
      sameSite: 'none',
      maxAge: 1000 * 60 * 60 * 24,

    });

    return {
      message: 'Login successful',
      data: user,
    };
  }

  async verifyEmail(token: string) {
    try {
      const user = await this.userService.verifyEmail(token)
      return user;
    } catch (error) {
      throw new UnauthorizedException(error);
    }
  }

  async forgotPassword(forgetPasswordDto: ForgetPasswordDto) {
    const { email } = forgetPasswordDto;
    const user = await this.userService.findUserByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActivated) {
      throw new UnauthorizedException('Please verify your email first');
    }

    const token = generateToken()

    await this.mailService.sendPasswordResetEmail(
      user.email,
      token
    );

    await this.userService.updateUser(user.id, {
      resetPasswordToken: token,
      resetPasswordTokenExpires: new Date(Date.now() + 1000 * 60 * 60 * 24),
    }); ``

    return {
      message: 'Login successful',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;
    const user = await this.userService.findUserByToken(token);

    if (!user) {
      throw new UnauthorizedException('Invalid token or expired, please request a new one');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await this.userService.updateUser(user.id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordTokenExpires: null,
    });

    return {
      message: 'Password reset successful',
    };
  }

  async googleLogin() {

  }

  // Signed, short-lived carrier for OAuth intent — there's no shared cookie
  // session to read req.user from mid-flow (see GoogleAuthGuard/mobile's
  // in-app-browser flow), so "what should the callback do" travels through
  // the provider's `state` round trip instead. `purpose` stops a normal
  // access_token JWT (or the exchange JWT below) from being replayed here.
  buildOAuthState(payload: Omit<OAuthStatePayload, 'purpose'>): string {
    return this.jwtService.sign(
      { purpose: 'oauth-state', ...payload },
      { expiresIn: '5m' },
    );
  }

  private decodeOAuthState(token: string | undefined, provider: OAuthProvider): OAuthStatePayload {
    if (!token) {
      return { purpose: 'oauth-state', intent: 'login', platform: 'web', provider };
    }

    let decoded: OAuthStatePayload;
    try {
      decoded = this.jwtService.verify<OAuthStatePayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired OAuth state');
    }

    if (decoded.purpose !== 'oauth-state' || decoded.provider !== provider) {
      throw new UnauthorizedException('Invalid OAuth state');
    }

    return decoded;
  }

  // Never throws — failures (bad/expired state, a provider account already
  // linked to someone else, ...) still need a platform to redirect back to,
  // so they come back as a tagged result instead of an exception.
  async handleOAuthCallback(
    provider: OAuthProvider,
    profile: OAuthProfile,
  ): Promise<
    | { ok: true; platform: OAuthPlatform; sessionId?: string; user: Awaited<ReturnType<UserService['findOrCreateOAuthUser']>> }
    | { ok: false; platform: OAuthPlatform; sessionId?: string; message: string }
  > {
    let state: OAuthStatePayload;
    try {
      state = this.decodeOAuthState(profile.state, provider);
    } catch (error) {
      // State itself failed to decode — no platform to recover, default to web.
      return { ok: false, platform: 'web', message: this.errorMessage(error) };
    }

    try {
      const user =
        state.intent === 'link'
          ? await this.linkOAuthAccountFromState(state, provider, profile.providerId)
          : await this.userService.findOrCreateOAuthUser(provider, profile.providerId, profile.email);

      return { ok: true, platform: state.platform, sessionId: state.sessionId, user };
    } catch (error) {
      return { ok: false, platform: state.platform, sessionId: state.sessionId, message: this.errorMessage(error) };
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'OAuth login failed';
  }

  private async linkOAuthAccountFromState(
    state: OAuthStatePayload,
    provider: OAuthProvider,
    providerId: string,
  ) {
    if (!state.sub) {
      throw new UnauthorizedException('Invalid link request');
    }
    return this.userService.linkOAuthAccount(state.sub, provider, providerId);
  }

  // Mobile-only: the callback runs inside the browser tab, which can't hand
  // anything back to the app directly (see OAuthSessionStore for why we
  // don't rely on a deep-link redirect either) — so it just marks the
  // session the client is polling as resolved. The client learns the result
  // from GET /auth/oauth/session/:id, not from this response.
  resolveMobileOAuthSession(
    sessionId: string | undefined,
    result: { ok: true; user: { id: string } } | { ok: false; message: string },
  ) {
    if (!sessionId) return;
    this.oauthSessions.resolve(
      sessionId,
      result.ok ? { status: 'done', userId: result.user.id } : { status: 'error', message: result.message },
    );
  }

  // Polled by the mobile client until the browser-side callback above
  // resolves the session. Only on a 'done' result do we actually set the
  // cookie — same as login()'s, issued over the client's own fetch (not the
  // browser tab), so credentials: 'include' is what picks it up.
  async pollOAuthSession(
    id: string,
    res: Response,
  ): Promise<{ status: 'pending' } | { status: 'error'; message: string } | { status: 'done'; data: unknown }> {
    const result = this.oauthSessions.take(id);

    if (result.status !== 'done') {
      return result;
    }

    const user = await this.userService.findUserById(result.userId);
    if (!user?.id || !user.email) {
      return { status: 'error', message: 'User not found' };
    }

    this.setAccessTokenCookie(res, { id: user.id, email: user.email });
    return { status: 'done', data: user };
  }

  // Web-only now: sets the cookie directly via a normal top-level browser
  // navigation the whole way through, same as login().
  buildOAuthRedirect(user: { id: string; email: string }, webUrl: string, res: Response): string {
    this.setAccessTokenCookie(res, user);
    // Not under /auth/ — web's other auth pages (/login, /register,
    // /reset-password) all live at the top level too, inside the (auth)
    // route group, which doesn't add a path segment.
    return `${webUrl}/callback`;
  }

  buildOAuthRedirectError(webUrl: string, message: string): string {
    return `${webUrl}/callback?error=${encodeURIComponent(message)}`;
  }

  private setAccessTokenCookie(res: Response, user: { id: string; email: string }) {
    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    res.cookie('access_token', token, {
      httpOnly: true,
      path: '/',
      secure: true,
      sameSite: 'none',
      maxAge: 1000 * 60 * 60 * 24,
    });
  }
}
