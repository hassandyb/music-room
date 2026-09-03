import { JwtService } from '@nestjs/jwt';
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayInit,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { Subscription } from '@prisma/client';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import {
    EditPolicyChangedPayload,
    MemberRemovedPayload,
    Playlist,
    PlaylistEditPolicy,
    PlaylistInitialState,
    PlaylistListDeletedPayload,
    PlaylistSocketCloseReason,
    PlaylistSyncPayload,
    PlaylistUpdatedPayload,
    PlaylistVisibility,
    TrackRemovedPayload,
    TracksAddedPayload,
} from '@repo/types';

/**
 * Real-time layer for a single playlist "room". This is a push-only stream
 * from the server's side (§5.1 of the module spec) - every mutation happens
 * over REST, the gateway just fans the result out to everyone watching.
 *
 * Deviation from the spec doc: it suggests one raw-`ws` connection per
 * playlist id with custom close codes (4003/4004/4008) so the client can
 * tell rejection reasons apart pre-accept. This app already standardizes on
 * a single socket.io adapter shared with the Event module's gateway
 * (apps/api/src/event/event.gateway.ts), and socket.io doesn't expose raw
 * close codes to the browser. We keep the single-namespace + explicit
 * joinPlaylist-message pattern already established there, and get the same
 * "tell rejection reasons apart" behavior by emitting a distinguishable
 * `error` payload (PlaylistSocketCloseReason) instead of a close code.
 */
@WebSocketGateway({
    cors: {
        origin: [process.env.WEB_URL, process.env.MOBILE_URL],
        credentials: true,
    },
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
    namespace: '/playlist',
})
export class PlaylistGateway implements OnGatewayInit, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly jwtService: JwtService,
        private readonly userService: UserService,
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
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
                next(new Error(PlaylistSocketCloseReason.UNAUTHENTICATED));
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

    handleDisconnect(client: Socket) {
        const playlistId = client.data.playlistId;
        const username = client.data.user?.username;
        if (playlistId && username) {
            client.to(playlistId).emit('USER_OFFLINE', { username });
        }
    }

    @SubscribeMessage('joinPlaylist')
    async handleJoinPlaylist(client: Socket, playlistId: string) {
        const user = client.data.user;

        const playlist = await this.prisma.playlist.findUnique({
            where: { id: playlistId },
            include: {
                license: true,
                members: { where: { userId: user.id } },
                tracks: { orderBy: { position: 'asc' }, include: { track: true } },
                owner: { select: { profile: { select: { subscription: true } } } },
            },
        });

        if (!playlist) {
            client.emit('error', { code: PlaylistSocketCloseReason.PLAYLIST_NOT_FOUND });
            return;
        }

        const isOwner = playlist.ownerId === user.id;
        const isMember = isOwner || playlist.members.length > 0;

        if (playlist.visibility === PlaylistVisibility.PRIVATE && !isMember) {
            client.emit('error', { code: PlaylistSocketCloseReason.FORBIDDEN });
            return;
        }

        client.join(playlistId);
        client.data.playlistId = playlistId;

        const canEdit =
            isOwner ||
            (!!playlist.license?.isEnabled && playlist.license.editPolicy === PlaylistEditPolicy.EVERYONE && isMember);

        const sockets = await this.server.in(playlistId).fetchSockets();
        const onlineUsernames = [...new Set(sockets.map((s) => s.data.user?.username as string).filter(Boolean))];

        const initialState: PlaylistInitialState = {
            id: playlist.id,
            name: playlist.name,
            description: playlist.description,
            coverUrl: playlist.coverUrl,
            visibility: playlist.visibility as PlaylistVisibility,
            editPolicy: (playlist.license?.editPolicy ?? PlaylistEditPolicy.EVERYONE) as PlaylistEditPolicy,
            isEnabled: playlist.license?.isEnabled ?? true,
            version: playlist.version,
            tracks: playlist.tracks as any,
            onlineUsernames,
            canEdit,
            isMember,
            isOwner,
            isCollaborative: playlist.owner.profile?.subscription === Subscription.PREMIUM,
        };

        client.emit('INITIAL_STATE', initialState);
        client.to(playlistId).emit('USER_ONLINE', { username: user.username, userId: user.id });
    }

    @SubscribeMessage('leavePlaylist')
    handleLeavePlaylist(client: Socket, playlistId: string) {
        client.leave(playlistId);
        client.to(playlistId).emit('USER_OFFLINE', { username: client.data.user?.username });
        client.data.playlistId = undefined;
    }

    broadcastPlaylistUpdated(playlistId: string, payload: PlaylistUpdatedPayload) {
        this.server.to(playlistId).emit('PLAYLIST_UPDATED', payload);
    }

    broadcastEditPolicyChanged(playlistId: string, payload: EditPolicyChangedPayload) {
        this.server.to(playlistId).emit('EDIT_POLICY_CHANGED', payload);
    }

    broadcastTracksAdded(playlistId: string, payload: TracksAddedPayload) {
        this.server.to(playlistId).emit('TRACKS_ADDED', payload);
    }

    broadcastTrackRemoved(playlistId: string, payload: TrackRemovedPayload) {
        this.server.to(playlistId).emit('TRACK_REMOVED', payload);
    }

    broadcastPlaylistSync(playlistId: string, payload: PlaylistSyncPayload) {
        this.server.to(playlistId).emit('PLAYLIST_SYNC', payload);
    }

    broadcastUserJoined(playlistId: string, username: string) {
        this.server.to(playlistId).emit('USER_JOINED', { username });
    }

    broadcastUserLeft(playlistId: string, username: string) {
        this.server.to(playlistId).emit('USER_LEFT', { username });
    }

    broadcastMemberRemoved(playlistId: string, payload: MemberRemovedPayload) {
        this.server.to(playlistId).emit('MEMBER_REMOVED', payload);
    }

    broadcastPlaylistDeleted(playlistId: string, playlistName: string) {
        this.server.to(playlistId).emit('PLAYLIST_DELETED', { playlistName });
    }

    /**
     * Namespace-wide (not room-scoped) - every socket connected to /playlist
     * gets these, including ones that only opened the list page and never
     * joined a specific playlist room. Lets the Public/Mine tabs stay live
     * without a manual refresh. Only call broadcastPlaylistListCreated for
     * PUBLIC playlists - a private one's name/owner shouldn't be pushed to
     * every connected stranger the way getPublicPlaylists() already refuses
     * to return it to them over REST.
     */
    broadcastPlaylistListCreated(playlist: Playlist) {
        this.server.emit('PLAYLIST_LIST_CREATED', playlist);
    }

    broadcastPlaylistListDeleted(playlistId: string) {
        const payload: PlaylistListDeletedPayload = { id: playlistId };
        this.server.emit('PLAYLIST_LIST_DELETED', payload);
    }
}
