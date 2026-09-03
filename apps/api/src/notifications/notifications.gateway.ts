import { JwtService } from '@nestjs/jwt';
import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { EventInvitationReceivedPayload, FriendRequestReceivedPayload, PlaylistInvitationReceivedPayload } from '@repo/types';

/**
 * Per-user personal notification channel (playlist spec §5.3) - keyed by the
 * connected user's own id, nobody else can join it. Shared across feature
 * modules (playlist invitations, friend requests, ...) so there's one socket
 * connection and one room-join convention for all cross-cutting personal
 * pushes, instead of a gateway per domain.
 */
@WebSocketGateway({
    cors: {
        origin: [process.env.WEB_URL, process.env.MOBILE_URL],
        credentials: true,
    },
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
    namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayInit, OnGatewayConnection {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly jwtService: JwtService,
        private readonly userService: UserService,
        private readonly configService: ConfigService,
    ) { }

    afterInit(server: Server) {
        server.use(async (socket: Socket, next) => {
            try {
                const token = this.extractToken(socket);
                if (!token) throw new Error('no token');

                const payload = this.jwtService.verify(token, {
                    secret: this.configService.get<string>('jwt_secret'),
                });

                const user = await this.userService.findUserById(payload.sub);
                if (!user?.id) throw new Error('user not found');

                socket.data.user = user;
                next();
            } catch {
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

    handleConnection(client: Socket) {
        const userId = client.data.user?.id;
        if (userId) {
            client.join(`user_${userId}`);
        }
    }

    notifyPlaylistInvitation(userId: string, payload: PlaylistInvitationReceivedPayload) {
        this.server.to(`user_${userId}`).emit('PLAYLIST_INVITATION_RECEIVED', payload);
    }

    notifyFriendRequest(userId: string, payload: FriendRequestReceivedPayload) {
        this.server.to(`user_${userId}`).emit('FRIEND_REQUEST_RECEIVED', payload);
    }

    notifyEventInvitation(userId: string, payload: EventInvitationReceivedPayload) {
        this.server.to(`user_${userId}`).emit('EVENT_INVITATION_RECEIVED', payload);
    }
}
