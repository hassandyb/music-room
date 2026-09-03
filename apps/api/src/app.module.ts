import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditLogInterceptor } from '../common/interceptors/audit-log.interceptor';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { ProfileModule } from './profile/profile.module';
import { ConfigModule } from '@nestjs/config';
import configuration from '../config/configuration';
import { validationSchema } from '../config/validation';
import { StorageModule } from './storage/storage.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { EventModule } from './event/event.module';
import { PlaylistModule } from './playlist/playlist.module';
import { TrackModule } from './track/track.module';
import { ExternalModule } from './external/external.module';
import { HttpModule } from '@nestjs/axios';
import { UserModule } from './user/user.module';
import { BullModule } from '@nestjs/bullmq';
import { FriendshipModule } from './friendship/friendship.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      load: [configuration],
      validationOptions: {
        abortEarly: false,
      },
    }),
    // Global request-rate ceiling (subject §V.6: protect against
    // bruteforce). Auth endpoints tighten this further with their own
    // @Throttle() override - see auth.controller.ts.
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    // LocalStorageService writes into uploads/tracks and hands back keys as
    // bare filenames (no "tracks/" prefix) - rootPath has to point at the
    // same tracks/ directory or every /files/<key> URL 404s.
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads/tracks'),
      serveRoot: '/files',
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT) || 6379,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    }),
    AuthModule,
    ProfileModule,
    EventModule,
    PlaylistModule,
    FriendshipModule,
    NotificationsModule,
    TrackModule,
    StorageModule,
    ExternalModule,
    HttpModule,
    UserModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Authenticated by default (subject §V.6) — routes opt out with
    // @Public() instead of every other route opting in with @UseGuards().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule { }
