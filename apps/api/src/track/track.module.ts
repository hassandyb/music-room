import { Module } from '@nestjs/common';
import { TrackController } from './track.controller';
import { TrackService } from './track.service';
import { ExternalModule } from '../external/external.module';

@Module({
  imports: [ExternalModule],
  controllers: [TrackController],
  providers: [TrackService]
})
export class TrackModule { }
