import { Middleware } from '@reduxjs/toolkit';
import { io, Socket } from 'socket.io-client';
import {
    socketConnected,
    socketDisconnected,
    roomJoined,
    eventDetailsUpdated,
    socketError,
    eventTracksUpdated,
    eventUpdateTrack,
} from './eventSlice';
import { EventTrack } from '@repo/types';


export const SOCKET_CONNECT = 'socket/connect';
export const SOCKET_DISCONNECT = 'socket/disconnect';
export const SOCKET_JOIN_ROOM = 'socket/joinRoom';
export const SOCKET_LEAVE_ROOM = 'socket/leaveRoom';
export const SOCKET_SEARCH_TRACKS = 'socket/searchTracks';
export const SOCKET_ADD_TRACK = 'socket/addTrackToEvent';
export const SOCKET_JOIN_EVENT = 'socket/joinEvent';
export const SOCKET_START_EVENT = 'socket/startEvent';
export const SOCKET_VOTE = 'socket/vote';


const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

export const socketMiddleware: Middleware = (store) => {
    let socket: Socket | null = null;

    return (next) => (action: any) => {
        switch (action.type) {
            case SOCKET_CONNECT: {
                if (socket?.connected) return next(action);

                socket = io(`${SOCKET_URL}/event`, {
                    path: '/socket.io',
                    withCredentials: true,
                    transports: ['websocket', 'polling'],
                });

                socket.on('connect', () => store.dispatch(socketConnected()));
                socket.on('disconnect', () => store.dispatch(socketDisconnected()));
                socket.on('connect_error', (err) =>
                    store.dispatch(socketError(err.message)),
                );

                socket.on('eventDetails', (payload) => {
                    store.dispatch(eventDetailsUpdated(payload.data))
                });

                socket.on('eventUpdated', (payload) => {
                    console.log("eventUpdated ---> ", payload.data)
                    store.dispatch(eventDetailsUpdated(payload.data))
                });

                socket.on('eventTracksUpdated', (payload) => {
                    console.log("eventTracksUpdated ---> ", payload.data)
                    store.dispatch(eventTracksUpdated(payload.data))
                });

                socket.on('eventVoteForTrack', (payload: { data: EventTrack }) => {
                    store.dispatch(eventUpdateTrack(payload.data))
                })

                socket.on('error', (payload) => {
                    store.dispatch(socketError(payload.error))
                });

                break;
            }

            case SOCKET_DISCONNECT: {
                socket?.disconnect();
                socket = null;
                break;
            }

            case SOCKET_JOIN_ROOM: {
                socket?.emit('joinRoom', action.payload.roomId);
                store.dispatch(roomJoined());
                break;
            }

            case SOCKET_LEAVE_ROOM: {
                socket?.emit('leaveRoom', action.payload.roomId);
                break;
            }

            case SOCKET_SEARCH_TRACKS: {
                socket?.emit('searchTracks', action.payload.query);
                break;
            }

            case SOCKET_ADD_TRACK: {
                socket?.emit('addTrackToEvent', action.payload);
                break;
            }

            case SOCKET_JOIN_EVENT: {
                socket?.emit('joinEvent', action.payload.eventId);
                break;
            }

            case SOCKET_START_EVENT: {
                socket?.emit('startEvent', action.payload.eventId);
                break;
            }

            case SOCKET_VOTE: {
                socket?.emit('voteForTrack', action.payload);
                break;
            }

            default:
                break;
        }

        return next(action);
    };
};



export const connectSocket = () => ({ type: SOCKET_CONNECT });
export const disconnectSocket = () => ({ type: SOCKET_DISCONNECT });
export const joinRoom = (roomId: string) => ({
    type: SOCKET_JOIN_ROOM,
    payload: { roomId },
});
export const leaveRoom = (roomId: string) => ({
    type: SOCKET_LEAVE_ROOM,
    payload: { roomId },
});
export const searchTracks = (query: string) => ({
    type: SOCKET_SEARCH_TRACKS,
    payload: { query },
});
export const addTrackToEvent = (eventId: string, trackId: string) => ({
    type: SOCKET_ADD_TRACK,
    payload: { eventId, trackId },
});

export const joinEvent = (eventId: string) => ({
    type: SOCKET_JOIN_EVENT,
    payload: { eventId },
});

export const startEvent = (eventId: string) => ({
    type: SOCKET_START_EVENT,
    payload: { eventId },
});

export const vote = (eventId: string, trackId: string, coords?: { latitude: number, longitude: number }) => ({
    type: SOCKET_VOTE,
    payload: { eventId, trackId, ...coords },
});