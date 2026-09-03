import { Injectable } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EventService, EventPhaseJobData } from './event.service';
import { TracksGateway } from './event.gateway';

@Injectable()
@Processor('event-queue')
export class EventProcessor extends WorkerHost {
    constructor(
        private eventService: EventService,
        private readonly eventGateway: TracksGateway,
    ) {
        super();
    }

    async process(job: Job<EventPhaseJobData>): Promise<any> {
        const { eventId } = job.data;
        try {
            switch (job.name) {
                case 'play-track':
                    const event = await this.eventService.advanceEvent(eventId, 40000);

                    const response = {
                        ...event
                    }
                    this.eventGateway.broadcastEventUpdated(eventId, response)
                    break;

                case 'advance-event':
                    const event2 = await this.eventService.playTrackEvent(eventId, 20000);
                    const response2 = {
                        ...event2,
                    }
                    this.eventGateway.broadcastEventUpdated(eventId, response2)
                    break;

                default:
                    throw new Error(`Unknown job name: ${job.name}`);
            }
        } catch (error) {
            throw error;
        }
    }


    @OnWorkerEvent('completed')
    onCompleted(job: Job<EventPhaseJobData>) {
        console.log(`Job ${job.id} completed for event ${job.data.eventId}`);
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<EventPhaseJobData>, error: Error) {
        console.error(`Job ${job.id} failed for event ${job.data.eventId}:`, error);
    }
}