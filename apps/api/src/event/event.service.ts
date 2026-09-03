import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EventPrivacy, EventStatus, LicenceType, Prisma } from '@prisma/client';
import { Event, EventInviteStatus, Licence, Privacy, Track, User } from '@repo/types';
import { AddTrackToEventDto } from './dto/add-track.dto';
import { GetEventsQueryDto } from './dto/get-events-query.dto';
import { generateToken, isWithinRadius } from '../../common/utils/utils';
import { FriendshipService } from '../friendship/friendship.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface EventPhaseJobData {
    eventId: string;
}


@Injectable()
export class EventService {

    constructor(
        private readonly prisma: PrismaService,
        private readonly friendshipService: FriendshipService,
        @InjectQueue('event-queue') private eventQueue: Queue<EventPhaseJobData>,
    ) { }


    async resetEvent(eventId: string) {
        await this.prisma.event.update({
            where: { id: eventId },
            data: {
                status: EventStatus.CREATED,
                currentTrackId: null,
                currentTrackStartTime: null
            }
        });
        await this.cancelAllJobs(eventId);
    }

    async playTrackEvent(eventId: string, delay: number) {

        const event = await this.getEventById(eventId);

        if (!event) {
            throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
        }

        if (event.status === EventStatus.VOTING) {
            throw new HttpException('Event is already in voting phase', HttpStatus.BAD_REQUEST);
        }

        if (event.tracks.length === 0) {
            throw new HttpException('Cannot start event without tracks', HttpStatus.BAD_REQUEST);
        }

        const unplayedTracks = event.tracks.filter((t) => !t.played);
        if (unplayedTracks.length === 0) {
            const finishedEvent = await this.prisma.event.update({
                where: { id: eventId },
                data: { status: EventStatus.FINISHED },
            });
            // await this.cancelAllJobs(eventId);
            return {
                status: finishedEvent.status,
                round: finishedEvent.round,
                currentTrackId: null,
                currentTrackStartTime: null,
                currentTrack: null,
            };
        }

        // round is 0 until the first voting round has ever opened, so this
        // distinguishes the initial "start event" action from the round-robin
        // re-entry into voting after a track finishes playing.
        const isInitialStart = event.round === 0;

        if (event.licence === Licence.GEOTIME) {
            if (!event.geoVotingStart || !event.geoVotingEnd) {
                throw new HttpException('Event is not configured for geoTime voting', HttpStatus.BAD_REQUEST);
            }

            const now = new Date();

            if (isInitialStart) {
                if (now < event.geoVotingStart) {
                    throw new HttpException('The voting window for this event has not started yet', HttpStatus.BAD_REQUEST);
                }
                if (now > event.geoVotingEnd) {
                    throw new HttpException('The voting window for this event has already ended', HttpStatus.BAD_REQUEST);
                }
            } else if (now >= event.geoVotingEnd) {
                // The voting window closed while the previous track was playing —
                // stop here instead of opening another voting round.
                const finishedEvent = await this.prisma.event.update({
                    where: { id: eventId },
                    data: { status: EventStatus.FINISHED },
                });
                await this.cancelAllJobs(eventId);

                return {
                    status: finishedEvent.status,
                    round: finishedEvent.round,
                    currentTrackId: null,
                    currentTrackStartTime: null,
                    currentTrack: null,
                };
            }
        }

        const eventUpdated = await this.prisma.event.update({
            where: { id: eventId },
            data: {
                status: EventStatus.VOTING,
                currentTrackId: null,
                currentTrackStartTime: null,
                round: event.round + 1
            },
        });

        this.eventQueue.add(
            'play-track',
            {
                eventId,
            },
            {
                delay, // 20 seconds delay for playing track
                jobId: `job-${eventId}-${Date.now()}`,
            }
        );

        return {
            status: eventUpdated.status,
            round: eventUpdated.round,
            currentTrackId: eventUpdated.currentTrackId,
            currentTrackStartTime: eventUpdated.currentTrackStartTime,
            currentTrack: null,
        };
    }


    async advanceEvent(eventId: string, delay: number) {

        const event = await this.getEventById(eventId);

        if (!event) {
            throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
        }

        if (event.tracks.length === 0) {
            throw new HttpException('Cannot start event without tracks', HttpStatus.BAD_REQUEST);
        }

        if (event.licence === Licence.GEOTIME && event.geoVotingEnd && new Date() >= event.geoVotingEnd) {
            // The voting window closed before this track could be selected —
            // end the event instead of playing anything else.
            const finishedEvent = await this.prisma.event.update({
                where: { id: eventId },
                data: { status: EventStatus.FINISHED },
            });
            await this.cancelAllJobs(eventId);

            return {
                status: finishedEvent.status,
                round: finishedEvent.round,
                currentTrackId: null,
                currentTrackStartTime: null,
                currentTrack: null,
            };
        }

        let tracks = event.tracks
            .filter((t) => !t.played)
            .sort((a, b) => b.votes.length - a.votes.length || a.track.title.localeCompare(b.track.title));

        const track = tracks[0];

        const updatedEvent = await this.prisma.event.update({
            where: { id: eventId },
            data: {
                status: EventStatus.PLAYING,
                currentTrackId: track.trackId,
                currentTrackStartTime: new Date().toISOString()
            },
            include: {
                currentTrack: true,
            }
        });

        await this.prisma.eventTrack.update({
            where: {
                eventId_trackId: {
                    eventId: eventId,
                    trackId: track.trackId
                }
            },
            data: {
                played: true,
                order: event.round
            }
        });

        const playableSeconds = track.track.path ? track.track.duration : Math.min(track.track.duration, 30);
        this.eventQueue.add(
            'advance-event',
            {
                eventId,
            },
            {
                delay: playableSeconds * 1000, // playable duration in milliseconds
                jobId: `job-${eventId}-${Date.now()}`,
            }
        );


        return {
            status: updatedEvent.status,
            round: updatedEvent.round,
            currentTrackId: updatedEvent.currentTrackId,
            currentTrackStartTime: updatedEvent.currentTrackStartTime,
            currentTrack: updatedEvent.currentTrack,
        };
    }


    async cancelAllJobs(eventId: string) {
        const jobs = await this.eventQueue.getJobs(['delayed', 'waiting', 'active']);
        for (const job of jobs) {
            if (job.data.eventId === eventId) {
                await job.remove();
            }
        }
    }

    async getAllEvents(user: User, query: GetEventsQueryDto) {
        try {
            const page = query.page ?? 1;
            const limit = query.limit ?? 12;

            const filters: Prisma.EventWhereInput[] = [{
                OR: [{
                    privacy: Privacy.PUBLIC,
                }, {
                    createdById: user.id,
                }, {
                    members: {
                        some: {
                            userId: user.id
                        }
                    }
                }]
            }];

            if (query.search) {
                filters.push({ title: { contains: query.search } });
            }
            if (query.status?.length) {
                filters.push({ status: { in: query.status as unknown as EventStatus[] } });
            }
            if (query.privacy?.length) {
                filters.push({ privacy: { in: query.privacy as unknown as EventPrivacy[] } });
            }
            if (query.licence?.length) {
                filters.push({ licence: { in: query.licence as unknown as LicenceType[] } });
            }
            if (query.hasGeoVoting) {
                filters.push({ latitude: { not: null }, longitude: { not: null } });
            }

            const where: Prisma.EventWhereInput = { AND: filters };

            const [events, total] = await Promise.all([
                this.prisma.event.findMany({
                    where,
                    skip: (page - 1) * limit,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        createdBy: {
                            select: {
                                username: true,
                            }
                        },
                        tracks: {
                            include: {
                                track: true,
                            }
                        }

                    }
                }),
                this.prisma.event.count({ where }),
            ]);

            return {
                data: events,
                meta: {
                    page,
                    limit,
                    total,
                    totalPages: Math.max(1, Math.ceil(total / limit)),
                },
            };
        } catch (err) {
            throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async createEvent(event: CreateEventDto, user: User) {
        console.log("event", event)
        try {
            return await this.prisma.event.create({
                data: {
                    ...event,
                    createdById: user.id,
                    status: EventStatus.CREATED,
                    members: {
                        create: [
                            {
                                user: {
                                    connect: {
                                        id: user.id,
                                    }
                                }
                            }
                        ]
                    }
                }
            });
        } catch (err) {
            throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async getEvent(id: string, user: User) {
        // permissions : if the event is private, the user must be a member of the event
        const event = await this.getEventById(id);
        if (!event) {
            throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
        }
        if (event.privacy === Privacy.PRIVATE) {
            const isCreator = event.createdBy?.id === user.id;
            const isMember = event.members.some((m) => m.id === user.id);
            if (!isCreator && !isMember) {
                throw new HttpException('This event is private', HttpStatus.FORBIDDEN);
            }
        }
        return event;
    }

    private async assertCanModifyEventTracks(eventId: string, user: User) {
        const event = await this.getEventById(eventId);
        if (!event) {
            throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
        }

        if (event.privacy === Privacy.PRIVATE) {
            const isCreator = event.createdBy?.id === user.id;
            const isMember = event.members.some((m) => m.id === user.id);
            if (!isCreator && !isMember) {
                throw new HttpException('This event is private', HttpStatus.FORBIDDEN);
            }
        }

        if (event.licence === Licence.INVITE_ONLY && event.createdBy?.id !== user.id) {
            const invite = await this.prisma.eventInvite.findFirst({
                where: {
                    eventId,
                    userId: user.id,
                    status: EventInviteStatus.ACCEPTED,
                }
            });
            if (!invite) {
                throw new HttpException('You are not invited to this event', HttpStatus.FORBIDDEN);
            }
        }

        if (event.status === EventStatus.FINISHED) {
            throw new HttpException('This event has ended, tracks can no longer be added', HttpStatus.BAD_REQUEST);
        }
        if (event.status !== EventStatus.CREATED) {
            throw new HttpException('Tracks can only be added before the event starts', HttpStatus.BAD_REQUEST);
        }

        return event;
    }

    async addTrackToEvent(track: AddTrackToEventDto, eventId: string, user: User) {
        await this.assertCanModifyEventTracks(eventId, user);

        const eventTrack = await this.prisma.eventTrack.create({
            data: {
                eventId: eventId,
                trackId: track.trackId,
                played: false,
            },
            include: {
                event: {
                    include: {
                        createdBy: {
                            select: {
                                username: true,
                            }
                        }
                    }
                },
                track: true,
                votes: true
            }
        });

        console.log("eventTrack----------------", eventTrack)

        return eventTrack;
    }

    async getEventById(id: string) {
        try {
            const event = await this.prisma.event.findUnique({
                where: {
                    id,
                },
                include: {
                    currentTrack: true,
                    createdBy: {
                        select: {
                            id: true,
                            username: true,
                        }
                    },
                    tracks: {
                        include: {
                            track: true,
                            votes: {
                                include: {
                                    user: {
                                        select: {
                                            id: true,
                                            username: true,
                                            profile: true,
                                        }
                                    }
                                }
                            },
                        }
                    },
                    members: {
                        include: {
                            user: {
                                select: {
                                    username: true,
                                    profile: true,

                                }
                            }
                        }
                    }
                }
            });
            if (event) {
                const transformedEvent = {
                    ...event,
                    members: event.members.map(member => ({
                        id: member.userId,
                        username: member.user.username,
                        profile: member.user.profile
                    }))
                };
                // console.log("transformedEvent", transformedEvent)
                return transformedEvent;
            }
            return event;
        } catch (err) {
            throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async joinEvent(id: string, user: User) {
        try {
            const existingEvent = await this.prisma.event.findUnique({ where: { id } });
            if (!existingEvent) {
                throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
            }

            if (existingEvent.privacy === Privacy.PRIVATE && existingEvent.createdById !== user.id) {
                const invite = await this.prisma.eventInvite.findFirst({
                    where: {
                        eventId: id,
                        userId: user.id,
                        status: EventInviteStatus.ACCEPTED,
                    }
                });
                if (!invite) {
                    throw new HttpException('This event is private, you need an invitation to join', HttpStatus.FORBIDDEN);
                }
            }

            // First, check if the user is already a member
            const existingMember = await this.prisma.eventMember.findFirst({
                where: {
                    eventId: id,
                    userId: user.id
                },
            });

            if (existingMember) {
                throw new HttpException('User is already a member of this event', HttpStatus.BAD_REQUEST);
            }

            // Update the event by creating a new EventMember record
            const event = await this.prisma.event.update({
                where: { id },
                data: {
                    members: {
                        create: {
                            user: {
                                connect: { id: user.id }
                            }
                        }
                    }
                },
                include: {
                    tracks: true,
                    createdBy: {
                        select: {
                            id: true,
                            username: true,
                        }
                    },
                    members: {
                        include: {
                            user: {
                                select: {
                                    profile: true,
                                    username: true
                                }
                            }
                        }
                    }
                }
            });

            if (event) {
                const transformedEvent = {
                    ...event,
                    members: event.members.map(member => ({
                        id: member.userId,
                        username: member.user.username,
                        profile: member.user.profile,
                    }))
                };
                return transformedEvent;
            }
            return event
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }


    async getMyInvitations(user: User) {
        const invitations = await this.prisma.eventInvite.findMany({
            where: { userId: user.id, status: EventInviteStatus.PENDING },
            include: { event: { select: { title: true, createdBy: { select: { username: true } } } } },
            orderBy: { createdAt: 'desc' },
        });

        return invitations.map((inv) => ({
            id: inv.id,
            eventId: inv.eventId,
            userId: inv.userId,
            createdAt: inv.createdAt,
            eventName: inv.event.title,
            creatorUsername: inv.event.createdBy.username,
        }));
    }

    async inviteToEvent(eventId: string, userId: string, currentUser: User) {

        const [event, invitee] = await Promise.all([
            this.prisma.event.findUnique({ where: { id: eventId } }),
            this.prisma.user.findUnique({ where: { id: userId } }),
        ]);
        if (!event) {
            throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
        }
        if (event.createdById !== currentUser.id) {
            throw new HttpException('Only the event creator can invite people to this event', HttpStatus.FORBIDDEN);
        }
        if (!invitee) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }
        if (userId === currentUser.id) {
            throw new HttpException('You cannot invite yourself', HttpStatus.BAD_REQUEST);
        }

        const isFriend = await this.friendshipService.isFriend(currentUser.id, userId);
        if (!isFriend) {
            throw new HttpException('You can only invite friends to your event', HttpStatus.BAD_REQUEST);
        }

        // First, check if the user is already a member
        const existingMember = await this.prisma.eventMember.findFirst({
            where: {
                eventId,
                userId
            }
        });

        if (existingMember) {
            throw new HttpException('User is already a member of this event', HttpStatus.BAD_REQUEST);
        }

        const existingInvite = await this.prisma.eventInvite.findFirst({
            where: { eventId, userId, status: EventInviteStatus.PENDING },
        });
        if (existingInvite) {
            throw new HttpException('User has already been invited', HttpStatus.BAD_REQUEST);
        }

        const invite = await this.prisma.eventInvite.create({
            data: {
                eventId,
                userId,
                inviteKey: generateToken(),
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
                status: EventInviteStatus.PENDING,
            },
            include: {
                event: true,
                user: true
            }
        });

        return invite;
    }

    async rejectInvitation(invitationId: string, user: User) {
        const invite = await this.prisma.eventInvite.findUnique({ where: { id: invitationId } });
        if (!invite || invite.userId !== user.id) {
            throw new NotFoundException('Invitation not found');
        }
        await this.prisma.eventInvite.delete({ where: { id: invitationId } });
    }

    private async finalizeAcceptance(invite: { id: string; eventId: string; userId: string }) {
        return this.prisma.$transaction([
            this.prisma.eventInvite.update({
                where: { id: invite.id },
                data: { status: EventInviteStatus.ACCEPTED },
            }),
            this.prisma.eventMember.create({
                data: { eventId: invite.eventId, userId: invite.userId, invitationId: invite.id },
            }),
        ]);
    }

    async acceptInvitation(invitationId: string, user: User) {
        const invite = await this.prisma.eventInvite.findUnique({ where: { id: invitationId } });
        if (!invite || invite.userId !== user.id) {
            throw new NotFoundException('Invitation not found');
        }
        if (invite.expiresAt < new Date()) {
            throw new HttpException('Invitation has expired', HttpStatus.BAD_REQUEST);
        }
        if (invite.status !== EventInviteStatus.PENDING) {
            throw new HttpException('Invitation has already been accepted or declined', HttpStatus.BAD_REQUEST);
        }

        await this.finalizeAcceptance(invite);
        return invite.eventId;
    }

    async acceptEventInvite(token: string, user: User) {

        const invite = await this.prisma.eventInvite.findUnique({
            where: {
                inviteKey: token,
            },
            include: {
                event: true,
                user: true
            }
        });
        if (!invite) {
            throw new HttpException('Invalid or expired invitation', HttpStatus.BAD_REQUEST);
        }
        if (invite.user.id !== user.id) {
            throw new HttpException('You are not authorized to accept this invitation', HttpStatus.FORBIDDEN);
        }
        if (invite.expiresAt < new Date()) {
            throw new HttpException('Invitation has expired', HttpStatus.BAD_REQUEST);
        }
        if (invite.status !== EventInviteStatus.PENDING) {
            throw new HttpException('Invitation has already been accepted or declined', HttpStatus.BAD_REQUEST);
        }

        await this.finalizeAcceptance(invite);
        return invite.event;
    }

    async voteForTrack(eventId: string, trackId: string, user: User, coords?: { latitude: number, longitude: number }) {

        const event = await this.getEventById(eventId);
        if (!event) {
            throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
        }

        if (event.privacy === Privacy.PRIVATE) {
            const isCreator = event.createdBy?.id === user.id;
            const isMember = event.members.some((m) => m.id === user.id);
            if (!isCreator && !isMember) {
                throw new HttpException('This event is private', HttpStatus.FORBIDDEN);
            }
        }

        if (event.status !== EventStatus.VOTING) {
            throw new HttpException('Event is not in voting state', HttpStatus.BAD_REQUEST);
        }

        const targetTrack = event.tracks.find((t) => t.trackId === trackId);
        if (!targetTrack) {
            throw new HttpException('Track not found in this event', HttpStatus.NOT_FOUND);
        }
        if (targetTrack.played) {
            throw new HttpException('This track has already been played', HttpStatus.BAD_REQUEST);
        }

        if (event.licence === Licence.INVITE_ONLY && event.createdBy?.id !== user.id) {
            const invite = await this.prisma.eventInvite.findFirst({
                where: {
                    eventId,
                    userId: user.id,
                    status: EventInviteStatus.ACCEPTED,
                }
            });
            if (!invite) {
                throw new HttpException('You are not invited to this event', HttpStatus.BAD_REQUEST);
            }
        }

        if (event.licence === Licence.GEOTIME) {
            if (!event.latitude || !event.longitude || !event.radius || !event.geoVotingStart || !event.geoVotingEnd) {
                throw new HttpException('Event is not configured for geoTime voting', HttpStatus.BAD_REQUEST);
            }
            if (!coords) {
                throw new HttpException('Your location is required to vote in this event', HttpStatus.BAD_REQUEST);
            }
            const isTheUserWithinRadius = isWithinRadius(
                coords.latitude,
                coords.longitude,
                event.latitude,
                event.longitude,
                event.radius
            )
            if (!isTheUserWithinRadius) {
                throw new HttpException('You are not within the radius of this event', HttpStatus.BAD_REQUEST);
            }
            if (
                event.geoVotingStart > new Date() ||
                event.geoVotingEnd < new Date()
            ) {
                throw new HttpException('It is not allowed to vote for this event at this time', HttpStatus.BAD_REQUEST);
            }
        }

        const vote = await this.prisma.trackVote.findFirst({
            where: {
                eventId,
                userId: user.id,
                round: event.round
            }
        });
        if (vote) {
            throw new HttpException('You have already voted for a track in this round', HttpStatus.BAD_REQUEST);
        }

        // add vote for track
        return await this.prisma.trackVote.create({
            data: {
                eventId,
                trackId,
                userId: user.id,
                isWithinRadius: true,
                latitude: coords?.latitude ?? 0,
                longitude: coords?.longitude ?? 0,
                round: event.round
            },
            include: {
                track: {
                    include: {
                        track: true,
                        votes: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        username: true,
                                        profile: true,
                                    }
                                }
                            }
                        }
                    }
                },
                user: true
            }
        });
    }
}


