import { io, Socket } from 'socket.io-client';
import { getBackendUrl } from '../api-config';

// Mirrors lib/api/socket.ts's connect story (JWT via httpOnly cookie fallback
// during the socket.io handshake - see that file's header comment) but for
// the dedicated /playlist namespace (apps/api/src/playlist/playlist.gateway.ts).
// Unlike the event gateway, every playlist mutation happens over REST - this
// gateway is push-only, so there are no emit-mutation helpers here, just
// join/leave-room plus whatever broadcast listeners a screen attaches.
//
// Two screens can legitimately hold this open at once (the playlist list, for
// namespace-wide PLAYLIST_LIST_CREATED/DELETED, and a playlist detail screen,
// for its room's broadcasts), so connect/disconnect are ref-counted instead
// of the single-owner assumption lib/api/socket.ts makes - otherwise the
// second screen's unmount would kill the first screen's still-active socket.
let socket: Socket | null = null;
let refCount = 0;

export async function connectPlaylistSocket(): Promise<Socket> {
  refCount++;
  if (socket) return socket;

  const baseUrl = await getBackendUrl();
  socket = io(`${baseUrl}/playlist`, {
    path: '/socket.io/',
    transports: ['polling', 'websocket'],
    withCredentials: true,
    forceNew: true,
    extraHeaders: { 'ngrok-skip-browser-warning': 'true' },
  });

  return socket;
}

export function disconnectPlaylistSocket(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0) {
    socket?.disconnect();
    socket = null;
  }
}

export function emitJoinPlaylist(socket: Socket, playlistId: string): void {
  socket.emit('joinPlaylist', playlistId);
}

export function emitLeavePlaylist(socket: Socket, playlistId: string): void {
  socket.emit('leavePlaylist', playlistId);
}
