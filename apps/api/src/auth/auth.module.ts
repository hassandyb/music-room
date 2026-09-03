import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { MailModule } from '../mail/mail.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleWebStrategy } from './strategies/google-web.strategy';
import { GoogleMobileStrategy } from './strategies/google-mobile.strategy';
import { FacebookWebStrategy } from './strategies/facebook-web.strategy';
import { FacebookMobileStrategy } from './strategies/facebook-mobile.strategy';
import { GoogleWebAuthGuard } from './guards/google-web-auth.guard';
import { GoogleMobileAuthGuard } from './guards/google-mobile-auth.guard';
import { FacebookWebAuthGuard } from './guards/facebook-web-auth.guard';
import { FacebookMobileAuthGuard } from './guards/facebook-mobile-auth.guard';
import { OAuthSessionStore } from './oauth-session.store';

@Module({
  imports: [
    PassportModule,
    UserModule,
    MailModule,
    JwtModule.registerAsync({

      inject: [ConfigService],

      useFactory: (config: ConfigService) => ({

          secret: config.get<string>("jwt_secret")!,

          signOptions: {

              expiresIn: "1d",

          },

      }),

  }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleWebStrategy,
    GoogleMobileStrategy,
    FacebookWebStrategy,
    FacebookMobileStrategy,
    GoogleWebAuthGuard,
    GoogleMobileAuthGuard,
    FacebookWebAuthGuard,
    FacebookMobileAuthGuard,
    OAuthSessionStore,
  ],
  exports: [AuthService],
})
export class AuthModule {}
