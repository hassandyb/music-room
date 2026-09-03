import { io, Socket } from 'socket.io-client';
import { getBackendUrl } from '../api-config';

// The gateway (apps/api/src/event/event.gateway.ts) authenticates via
// socket.handshake.auth.token first, falling back to reading the
// 'access_token' cookie from the handshake headers. Mobile has no
// JS-readable token (cookie-only auth, see api-client.ts), so this relies on
// the cookie fallback - `withCredentials: true` + 'polling' in the transports
// list makes socket.io-client's initial XHR handshake carry the cookie the
// same way a normal authenticated fetch does. If a device/OS combination
// doesn't carry the cookie over the socket handshake, the gateway will reject
// the connection with an 'Unauthorized' error - screens using this should
// fall back to polling the REST endpoint (see app/events/[id].tsx).
let socket: Socket | null = null;

export async function connectEventSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const baseUrl = await getBackendUrl();
  const newSocket = io(`${baseUrl}/event`, {
    path: '/socket.io/',
    transports: ['polling', 'websocket'],
    withCredentials: true,
    forceNew: true,
    extraHeaders: { 'ngrok-skip-browser-warning': 'true' },
  });
  socket = newSocket;

  // Wait for the handshake to actually finish before handing the socket
  // back - `io()` returns synchronously while auth happens in the
  // background, so callers that emit right away (e.g. handleVote) could
  // otherwise silently lose their message if the connection was still
  // pending or the handshake got rejected (see the comment above on
  // cookie-based auth not always carrying over).
  return new Promise((resolve, reject) => {
    newSocket.once('connect', () => resolve(newSocket));
    newSocket.once('connect_error', (err) => reject(err));
  });
}

export function disconnectEventSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getEventSocket(): Socket | null {
  return socket;
}

// Thin typed wrappers around the gateway's SubscribeMessage handlers
// (apps/api/src/event/event.gateway.ts) - every handler broadcasts its result
// to the room rather than acking the caller directly, so these are fire-and-
// forget; screens listen for the corresponding broadcast event separately.
export function emitJoinRoom(socket: Socket, eventId: string): void {
  socket.emit('joinRoom', eventId);
}

export function emitLeaveRoom(socket: Socket, eventId: string): void {
  socket.emit('leaveRoom', eventId);
}

// Only call this if the current user isn't already a member - the gateway's
// joinEvent handler throws (caught, emits 'error') if you're already one.
export function emitJoinEvent(socket: Socket, eventId: string): void {
  socket.emit('joinEvent', eventId);
}

// Starts a voting round: 20s to vote, then the highest-voted unplayed track
// plays automatically. No permission check server-side yet, but the UI only
// shows this to the event creator.
export function emitStartEvent(socket: Socket, eventId: string): void {
  socket.emit('startEvent', eventId);
}

export function emitVoteForTrack(
  socket: Socket,
  eventId: string,
  trackId: string,
  coords?: { latitude: number; longitude: number },
): void {
  socket.emit('voteForTrack', { eventId, trackId, ...coords });
}

export function emitAddTrackToEvent(socket: Socket, eventId: string, trackId: string): void {
  socket.emit('addTrackToEvent', { eventId, trackId });
}
