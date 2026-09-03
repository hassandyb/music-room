
import { JwtService } from '@nestjs/jwt';
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayInit,
    OnGatewayDisconnect
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserService } from '../user/user.service';
import { ConfigService } from '@nestjs/config';
import { EventService } from './event.service';
import { User } from '@prisma/client';
import { Event, EventMembersUpdated, EventStatus, EventStatusUpdated, EventTracksUpdated, UserWithProfile } from '@repo/types';

@WebSocketGateway({
    cors: {
        origin: [process.env.WEB_URL, process.env.MOBILE_URL],
        credentials: true,
    },
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
    namespace: '/event',

})
export class TracksGateway implements OnGatewayConnection, OnGatewayInit {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly jwtService: JwtService,
        private readonly usersService: UserService,
        private readonly configService: ConfigService,
        private readonly eventService: EventService,
    ) { }

    afterInit(server: Server) {
        server.use(async (socket: Socket, next) => {
            try {
                const token = this.extractToken(socket);
                if (!token) throw new Error('No token provided');

                const payload = this.jwtService.verify(token, {
                    secret: this.configService.get<string>('jwt_secret'),
                });

                const user = await this.usersService.findUserById(payload.sub);
                if (!user) throw new Error('User not found');

                socket.data.user = user;
                next();
            } catch (err) {
                next(new Error('Unauthorized'));
            }
        });
    }

    private extractToken(socket: Socket): string | undefined {
        const authToken = socket.handshake.auth?.token as string | undefined;
        if (authToken) return authToken;

        const cookies = socket.handshake.headers.cookie;
        if (!cookies) return undefined;

        const match = cookies
            .split(';')
            .map((c) => c.trim())
            .find((c) => c.startsWith('access_token='));

        return match?.split('=')[1];
    }


    handleConnection(client: Socket) { }

    @SubscribeMessage('joinRoom')
    async handleJoinRoom(client: Socket, roomId: string) {
        try {
            client.join(roomId);
            const sockets = await this.server.in(roomId).fetchSockets();
            const user = client.data.user;
            const event = await this.eventService.getEvent(roomId.toString(), user);
            const connections = sockets.map((s) => ({
                id: s.id,
                data: s.data?.user || {},
            }));
            const members = this.eventMembers(event?.members, connections)

            if (!event) {
                this.server.in(roomId).emit('eventDetails', { data: null });
                return;
            }
            this.server.in(roomId).emit('eventDetails', { data: { ...event, members } });
        } catch (err) {
            client.emit('eventDetails', { data: null });
        }

    }

    @SubscribeMessage('leaveRoom')
    async handleLeaveRoom(client: Socket, roomId: string) {
        client.leave(roomId)

        // update event members 
        const sockets = await this.server.in(roomId).fetchSockets();
        const user = client.data.user;
        const event = await this.eventService.getEvent(roomId.toString(), user);
        const connections = sockets.map((s) => ({
            id: s.id,
            data: s.data?.user || {},
        }));
        const members = this.eventMembers(event?.members, connections)
        console.log("Socket DISConnected => ", members)
        if (!event) {
            this.server.in(roomId).emit('eventDetails', { data: null });
            return;
        }
        this.server.in(roomId).emit('eventDetails', { data: { ...event, members } });
    }

    @SubscribeMessage('addTrackToEvent')
    async handleAddTrackToEvent(client: Socket, data: { eventId: string, trackId: string }) {
        try {
            const user = client.data.user;
            const track = await this.eventService.addTrackToEvent(
                {
                    trackId: data.trackId
                },
                data.eventId,
                user
            );

            const response = {
                track: track,
            }

            this.server.in(data.eventId).emit('eventTracksUpdated', { data: response });
        } catch (err) {
            client.emit('error', { error: err?.message || "Failed to add track" });
        }
    }

    @SubscribeMessage('joinEvent')
    async handleJoinEvent(client: Socket, eventId: string) {
        try {
            const event = await this.eventService.joinEvent(eventId, client.data.user);
            if (!event) {
                this.server.in(eventId).emit('eventUpdated', { data: null });
                return;
            }

            const sockets = await this.server.in(eventId).fetchSockets();
            const connections = sockets.map((s) => ({
                id: s.id,
                data: s.data?.user || {},
            }));

            const members = this.eventMembers(event?.members, connections)

            const response: EventMembersUpdated = {
                members
            }
            this.server.in(eventId).emit('eventUpdated', { data: response });
        } catch (err) {
            client.emit('error', { error: err?.message || "Failed to join event" });
        }
    }

    @SubscribeMessage('startEvent')
    async startEvent(client: Socket, eventId: string) {
        try {
            const user = client.data.user;
            const existingEvent = await this.eventService.getEventById(eventId);
            if (!existingEvent) {
                client.emit('error', { error: 'Event not found' });
                return;
            }
            if (existingEvent.createdBy?.id !== user.id) {
                client.emit('error', { error: 'Only the event creator can start this event' });
                return;
            }

            const event = await this.eventService.playTrackEvent(
                eventId,
                1000 * 20
            );

            // console.log(event)

            const response = {
                ...event
            }

            // broadcast response with updated event
            this.server.in(eventId).emit('eventUpdated', { data: response });
        } catch (err) {
            client.emit('error', { error: err?.message || "Failed to start event" });
        }
    }

    @SubscribeMessage('voteForTrack')
    async voteForTrack(client: Socket, data: { eventId: string, trackId: string, latitude?: number, longitude?: number }) {
        try {
            const user = client.data.user;
            const coords = (typeof data.latitude === 'number' && typeof data.longitude === 'number')
                ? { latitude: data.latitude, longitude: data.longitude }
                : undefined;

            // update event status to voting and add job to play track after 20 sec
            const vote = await this.eventService.voteForTrack(
                data.eventId,
                data.trackId,
                user,
                coords
            );

            this.server.in(data.eventId).emit('eventVoteForTrack', { data: vote.track });
        } catch (err) {
            client.emit('error', { error: err?.message || "Failed to vote for track" });
        }
    }

    private eventMembers(members: any[] | undefined, connections: { data: User }[]) {
        if (members) {
            const r = members.map((m) => {
                return {
                    ...m,
                    isOnline: connections.some((c) => c.data.id === m.id),
                };
            });
            return r;
        }
        return [];
    }

    broadcastEventUpdated(eventId: string, data: any) {
        this.server.to(eventId).emit('eventUpdated', {
            data,
        });
    }


}