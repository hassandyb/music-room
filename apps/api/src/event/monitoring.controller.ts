import { InjectQueue } from "@nestjs/bullmq";
import { Controller, Get, Param } from "@nestjs/common";
import { Queue } from "bullmq";
import { Public } from "../auth/decorators/public.decorator";

// Unauthenticated today (pre-existing behaviour, not something this pass
// changes) — kept public rather than silently locking it down, but this
// exposes queue internals and job cancellation with zero auth; worth
// restricting to authenticated/admin users separately.
@Public()
@Controller('monitoring')
export class MonitoringController {
  constructor(
    @InjectQueue('event-queue') private eventQueue: Queue,
  ) { }

  @Get('queues')
  async getQueueMetrics() {
    const [
      waitingCount,
      activeCount,
      completedCount,
      failedCount,
      delayedCount,
    ] = await Promise.all([
      this.eventQueue.getWaitingCount(),
      this.eventQueue.getActiveCount(),
      this.eventQueue.getCompletedCount(),
      this.eventQueue.getFailedCount(),
      this.eventQueue.getDelayedCount(),
    ]);

    return {
      waiting: waitingCount,
      active: activeCount,
      completed: completedCount,
      failed: failedCount,
      delayed: delayedCount,
    };
  }

  @Get('jobs/:jobId')
  async getJob(@Param('jobId') jobId: string) {
    return this.eventQueue.getJob(jobId);
  }

  @Get('cancelAll/event/:eventId')
  async cancelAll(@Param('eventId') eventId: string) {
    const jobs = await this.eventQueue.getJobs(['delayed', 'waiting', 'active']);
    for (const job of jobs) {
      if (job.data.eventId === eventId) {
        await job.remove();
      }
    }
    return {
      message: 'All jobs for event ' + eventId + ' have been cancelled'
    }
  }
}