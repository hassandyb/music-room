import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Query, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateEventDto } from './dto/create-event.dto';
import { EventService } from './event.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { type User } from '@repo/types';
import { Public } from '../auth/decorators/public.decorator';
import { ApiResponseDto, ApiResponseOf } from '../../common/dto/api-response.dto';
import { AddTrackToEventDto } from './dto/add-track.dto';
import { GetEventsQueryDto } from './dto/get-events-query.dto';
import { InviteToEventDto } from './dto/invite-to-event.dto';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { AuditAction } from '../../common/decorators/audit-log.decorator';

@Controller('event')
export class EventController {

  constructor(
    private readonly eventService: EventService,
    private readonly notificationsGateway: NotificationsGateway,
  ) { }

  // Unauthenticated today (pre-existing behaviour, not something this pass
  // changes) — kept public rather than silently locking them down.
  @Public()
  @Get('reset/:id')
  resetEvent(@Param('id') id: string) {
    return this.eventService.resetEvent(id);
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all events' })
  @ApiResponse({ type: ApiResponseOf(Event) })
  getAllEvents(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetEventsQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.eventService.getAllEvents(user, query);
  }

  @Post('create')
  @AuditAction('EVENT_CREATE')
  @ApiOperation({ summary: 'Create an event' })
  createEvent(@Body() event: CreateEventDto, @CurrentUser() user: User) {
    return this.eventService.createEvent(event, user);
  }

  @Get('invitations')
  @ApiOperation({ summary: 'List my pending event invitations' })
  getMyInvitations(@CurrentUser() user: User) {
    return this.eventService.getMyInvitations(user);
  }

  @Post('invitations/:invitationId/accept')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Accept an event invitation' })
  async acceptInvitation(@Param('invitationId') invitationId: string, @CurrentUser() user: User) {
    await this.eventService.acceptInvitation(invitationId, user);
  }

  @Post('invitations/:invitationId/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reject an event invitation' })
  rejectInvitation(@Param('invitationId') invitationId: string, @CurrentUser() user: User) {
    return this.eventService.rejectInvitation(invitationId, user);
  }

  @Get('accept/:token')
  @ApiOperation({ summary: 'Accept an event invitation by its emailed token' })
  @ApiResponse({ type: ApiResponseDto })
  acceptEventInvite(@Param('token') token: string, @CurrentUser() user: User) {
    return this.eventService.acceptEventInvite(token, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an event' })
  @ApiResponse({ type: ApiResponseOf(Event) })
  getEvent(@Param('id') id: string, @CurrentUser() user: User) {
    return this.eventService.getEvent(id, user);
  }


  @Post('join/:id')
  @AuditAction('EVENT_JOIN')
  @ApiOperation({ summary: 'Join an event' })
  @ApiResponse({ type: ApiResponseDto })
  joinEvent(@Param('id') id: string, @CurrentUser() user: User) {
    return this.eventService.joinEvent(id, user);
  }

  // Unauthenticated today (pre-existing behaviour, not something this pass
  // changes) — kept public rather than silently locking it down.
  @Public()
  @Put('update')
  @ApiOperation({ summary: 'Update an event' })
  updateEvent() {
    // Logic to update an event
  }

  @Post('invite/:id')
  @AuditAction('EVENT_INVITE_SENT')
  @ApiOperation({ summary: 'Invite someone to an event' })
  async inviteToEvent(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: InviteToEventDto,
    @CurrentUser() currentUser: User,
  ) {
    const invite = await this.eventService.inviteToEvent(id, dto.userId, currentUser);
    this.notificationsGateway.notifyEventInvitation(dto.userId, {
      id: invite.id,
      eventId: invite.eventId,
      eventName: (invite as any).event.title,
      creatorUsername: currentUser.username,
    });
    return invite;
  }



  @Post('/:eventId/add-track')
  @ApiOperation({ summary: 'Add a song to an event' })
  addTrackToEvent(@Body() track: AddTrackToEventDto, @Param('eventId') eventId: string, @CurrentUser() user: User) {
    return this.eventService.addTrackToEvent(track, eventId, user);
  }
}
