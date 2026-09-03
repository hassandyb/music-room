import { Module } from '@nestjs/common';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { EventProcessor } from './event.processor';
import { TracksGateway } from './event.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserModule } from '../user/user.module';
import { BullModule } from '@nestjs/bullmq';
import { MonitoringController } from './monitoring.controller';
import { FriendshipModule } from '../friendship/friendship.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    JwtModule.register({
      secret: new ConfigService().get<string>('jwt_secret')
    }),
    BullModule.registerQueue({
      name: 'event-queue'
    }),
    FriendshipModule,
    NotificationsModule,
    UserModule,
  ],
  controllers: [EventController, MonitoringController],
  providers: [
    EventService,
    EventProcessor, // Add the processor
    TracksGateway,
  ],
  exports: [TracksGateway]
})
export class EventModule { }