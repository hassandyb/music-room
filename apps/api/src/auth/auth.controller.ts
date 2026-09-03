import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Res,
  HttpStatus,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ForgetPasswordDto } from './dto/forget-password.dto';
import type { Response } from 'express';
import { Public } from './decorators/public.decorator';
import { GoogleWebAuthGuard } from './guards/google-web-auth.guard';
import { GoogleMobileAuthGuard } from './guards/google-mobile-auth.guard';
import { FacebookWebAuthGuard } from './guards/facebook-web-auth.guard';
import { FacebookMobileAuthGuard } from './guards/facebook-mobile-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { User } from '@prisma/client';
import {
  ApiResponseDto,
  ApiResponseOf,
} from '../../common/dto/api-response.dto';
import { UserDto } from './dto/user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuditAction } from '../../common/decorators/audit-log.decorator';
import type { OAuthProfile, OAuthProvider } from './types/oauth';

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) { }

  @Get('me')
  @ApiOperation({ summary: 'Get current user' })
  me(@CurrentUser() user: User) {
    return user;
  }

  @Public()
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @AuditAction('AUTH_LOGIN')
  @ApiOperation({ summary: 'Login a user' })
  @ApiResponse({ type: ApiResponseOf(UserDto) })
  login(@Body() LoginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(LoginDto, res);
  }

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @AuditAction('AUTH_REGISTER')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ type: ApiResponseDto })
  register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }


  @Public()
  @Get('verify-email')
  @AuditAction('AUTH_EMAIL_VERIFIED')
  @ApiOperation({ summary: 'Verify email' })
  @ApiResponse({ type: ApiResponseDto })
  async verifyEmail(
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    await this.authService.verifyEmail(token);
    return res.redirect(`${this.configService.get('web_url')}/login`);
  }

  @Public()
  @Post('logout')
  @AuditAction('AUTH_LOGOUT')
  @ApiOperation({ summary: 'Logout a user' })
  @ApiResponse({ type: ApiResponseDto })
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });

    return {
      message: 'Logged out successfully',
    };
  }

  @Public()
  @Post('forgot-password')
  @AuditAction('AUTH_FORGOT_PASSWORD')
  @ApiOperation({ summary: 'Forgot password' })
  @ApiResponse({ type: ApiResponseDto })
  forgotPassword(@Body() forgetPasswordDto: ForgetPasswordDto) {
    return this.authService.forgotPassword(forgetPasswordDto);
  }

  @Public()
  @Post('reset-password')
  @AuditAction('AUTH_RESET_PASSWORD')
  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({ type: ApiResponseDto })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Public()
  @Post('google-login')
  @AuditAction('AUTH_GOOGLE_LOGIN')
  @ApiOperation({ summary: 'Google login' })
  @ApiResponse({ type: ApiResponseDto })
  googleLogin() {
    return this.authService.googleLogin();
  }

  @Public()
  @Get('google/web')
  @ApiOperation({ summary: 'Start Google OAuth2 login for the web app (redirects to Google)' })
  @UseGuards(GoogleWebAuthGuard)
  startGoogleWebAuth() {
    // Unreachable: GoogleWebAuthGuard redirects to Google before this ever runs.
  }

  @Public()
  @Get('google/callback/web')
  @ApiOperation({ summary: 'Google OAuth2 callback for the web app' })
  @UseGuards(GoogleWebAuthGuard)
  async googleWebAuthCallback(@CurrentUser() profile: OAuthProfile, @Res() res: Response) {
    return this.finishOAuthCallback('google', profile, res);
  }

  @Public()
  @Get('google/mobile')
  @ApiOperation({ summary: 'Start Google OAuth2 login for the mobile app (redirects to Google)' })
  @UseGuards(GoogleMobileAuthGuard)
  startGoogleMobileAuth() {
    // Unreachable: GoogleMobileAuthGuard redirects to Google before this ever runs.
  }

  @Public()
  @Get('google/callback/mobile')
  @ApiOperation({ summary: 'Google OAuth2 callback for the mobile app' })
  @UseGuards(GoogleMobileAuthGuard)
  async googleMobileAuthCallback(@CurrentUser() profile: OAuthProfile, @Res() res: Response) {
    return this.finishOAuthCallback('google', profile, res);
  }

  @Public()
  @Get('facebook/web')
  @ApiOperation({ summary: 'Start Facebook OAuth2 login for the web app (redirects to Facebook)' })
  @UseGuards(FacebookWebAuthGuard)
  startFacebookWebAuth() {
    // Unreachable: FacebookWebAuthGuard redirects to Facebook before this ever runs.
  }

  @Public()
  @Get('facebook/callback/web')
  @ApiOperation({ summary: 'Facebook OAuth2 callback for the web app' })
  @UseGuards(FacebookWebAuthGuard)
  async facebookWebAuthCallback(@CurrentUser() profile: OAuthProfile, @Res() res: Response) {
    return this.finishOAuthCallback('facebook', profile, res);
  }

  @Public()
  @Get('facebook/mobile')
  @ApiOperation({ summary: 'Start Facebook OAuth2 login for the mobile app (redirects to Facebook)' })
  @UseGuards(FacebookMobileAuthGuard)
  startFacebookMobileAuth() {
    // Unreachable: FacebookMobileAuthGuard redirects to Facebook before this ever runs.
  }

  @Public()
  @Get('facebook/callback/mobile')
  @ApiOperation({ summary: 'Facebook OAuth2 callback for the mobile app' })
  @UseGuards(FacebookMobileAuthGuard)
  async facebookMobileAuthCallback(@CurrentUser() profile: OAuthProfile, @Res() res: Response) {
    return this.finishOAuthCallback('facebook', profile, res);
  }

  private async finishOAuthCallback(
    provider: OAuthProvider,
    profile: OAuthProfile,
    res: Response,
  ) {
    const result = await this.authService.handleOAuthCallback(provider, profile);

    // Mobile never gets redirected anywhere — see OAuthSessionStore for why
    // (Expo Go has no fixed URL scheme to catch a redirect with). The
    // browser tab just gets told to close; the app already knows what
    // happened because it's polling the session id from here.
    if (result.platform === 'mobile') {
      this.authService.resolveMobileOAuthSession(result.sessionId, result);
      res.type('html').send(oauthResultPage(result.ok, result.ok ? undefined : result.message));
      return;
    }

    const webUrl = this.configService.get<string>('web_url')!;
    const redirectUrl = result.ok
      ? this.authService.buildOAuthRedirect(result.user, webUrl, res)
      : this.authService.buildOAuthRedirectError(webUrl, result.message);

    res.redirect(HttpStatus.FOUND, redirectUrl);
  }

  @Public()
  @Get('oauth/session/:id')
  @ApiOperation({ summary: 'Poll a mobile OAuth2 session started via GET /auth/:provider' })
  pollOAuthSession(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    return this.authService.pollOAuthSession(id, res);
  }

  @Get('oauth/link-state')
  @ApiOperation({ summary: 'Mint a state token to link a provider account to the current user' })
  linkState(
    @Query('provider') provider: string,
    @Query('session') sessionId: string | undefined,
    @CurrentUser() user: User,
  ) {
    if (provider !== 'google' && provider !== 'facebook') {
      throw new BadRequestException('provider must be "google" or "facebook"');
    }

    const state = this.authService.buildOAuthState({
      intent: 'link',
      platform: 'mobile',
      provider,
      sub: user.id,
      sessionId,
    });

    return { state };
  }
}

// Shown in the in-app browser tab after the provider round trip finishes —
// the mobile app itself never sees this page, it's just what the user looks
// at for the second or two before they switch back (or the tab auto-closes
// on iOS; Android has no API to close a Custom Tab programmatically).
function oauthResultPage(ok: boolean, message?: string): string {
  const heading = ok ? 'Signed in' : 'Sign-in failed';
  const body = ok ? 'You can return to the app now.' : (message ?? 'Something went wrong.');
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${heading}</title>
<style>
  body { font: 16px -apple-system, system-ui, sans-serif; display: flex; flex-direction: column;
    align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; padding: 24px; }
</style>
</head>
<body>
  <h1>${heading}</h1>
  <p>${escapeHtml(body)}</p>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
