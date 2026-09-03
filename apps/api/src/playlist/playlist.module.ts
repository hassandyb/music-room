import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PlaylistController } from './playlist.controller';
import { PlaylistService } from './playlist.service';
import { PlaylistGateway } from './playlist.gateway';
import { PlaylistAccessGuard } from './guards/playlist-access.guard';
import { PlaylistOwnerGuard } from './guards/playlist-owner.guard';
import { PlaylistEditLicenseGuard } from './guards/playlist-edit-license.guard';
import { UserModule } from '../user/user.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FriendshipModule } from '../friendship/friendship.module';

@Module({
    imports: [
        JwtModule.register({
            secret: new ConfigService().get<string>('jwt_secret'),
        }),
        NotificationsModule,
        FriendshipModule,
        UserModule,
    ],
    controllers: [PlaylistController],
    providers: [
        PlaylistService,
        PlaylistGateway,
        PlaylistAccessGuard,
        PlaylistOwnerGuard,
        PlaylistEditLicenseGuard,
    ],
    exports: [PlaylistGateway],
})
export class PlaylistModule { }
