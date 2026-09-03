import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationsGateway } from './notifications.gateway';
import { UserModule } from '../user/user.module';

@Module({
    imports: [
        JwtModule.register({
            secret: new ConfigService().get<string>('jwt_secret'),
        }),
        UserModule,
    ],
    providers: [NotificationsGateway],
    exports: [NotificationsGateway],
})
export class NotificationsModule { }
