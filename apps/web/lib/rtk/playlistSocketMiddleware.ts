import { Middleware } from "@reduxjs/toolkit";
import { io, Socket } from "socket.io-client";
import { Playlist, PlaylistListDeletedPayload } from "@repo/types";
import { playlistApi } from "@/services/playlistApi";
import {
  socketConnected,
  socketDisconnected,
  roomJoined,
  initialStateReceived,
  userOnline,
  userOffline,
  userJoinedRoom,
  userLeftRoom,
  memberRemoved,
  playlistUpdated,
  editPolicyChanged,
  tracksAdded,
  trackRemoved,
  playlistSynced,
  playlistDeleted,
  socketError,
} from "./playlistSlice";

export const PLAYLIST_SOCKET_CONNECT = "playlistSocket/connect";
export const PLAYLIST_SOCKET_DISCONNECT = "playlistSocket/disconnect";
export const PLAYLIST_SOCKET_JOIN = "playlistSocket/joinPlaylist";
export const PLAYLIST_SOCKET_LEAVE = "playlistSocket/leavePlaylist";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

export const playlistSocketMiddleware: Middleware = (store) => {
  // RTK Query's updateQueryData returns a thunk, but the generic Middleware
  // type only knows about plain-action dispatch - same reasoning as the
  // `action: any` below.
  const dispatch = store.dispatch as (action: any) => void;
  let socket: Socket | null = null;

  return (next) => (action: any) => {
    switch (action.type) {
      case PLAYLIST_SOCKET_CONNECT: {
        if (socket?.connected) return next(action);

        socket = io(`${SOCKET_URL}/playlist`, {
          path: "/socket.io",
          withCredentials: true,
          transports: ["websocket", "polling"],
        });

        socket.on("connect", () => store.dispatch(socketConnected()));
        socket.on("disconnect", () => store.dispatch(socketDisconnected()));
        socket.on("connect_error", (err) => store.dispatch(socketError(err.message)));

        socket.on("INITIAL_STATE", (payload) => {
          store.dispatch(initialStateReceived(payload));
          store.dispatch(roomJoined());
        });
        socket.on("USER_ONLINE", (payload) => store.dispatch(userOnline(payload)));
        socket.on("USER_OFFLINE", (payload) => store.dispatch(userOffline(payload)));
        socket.on("USER_JOINED", () => store.dispatch(userJoinedRoom()));
        socket.on("USER_LEFT", () => store.dispatch(userLeftRoom()));
        socket.on("MEMBER_REMOVED", () => store.dispatch(memberRemoved()));
        socket.on("PLAYLIST_UPDATED", (payload) => store.dispatch(playlistUpdated(payload)));
        socket.on("EDIT_POLICY_CHANGED", (payload) => store.dispatch(editPolicyChanged(payload)));
        socket.on("TRACKS_ADDED", (payload) => store.dispatch(tracksAdded(payload)));
        socket.on("TRACK_REMOVED", (payload) => store.dispatch(trackRemoved(payload)));
        socket.on("PLAYLIST_SYNC", (payload) => store.dispatch(playlistSynced(payload)));
        socket.on("PLAYLIST_DELETED", () => store.dispatch(playlistDeleted()));
        socket.on("error", (payload) => store.dispatch(socketError(payload?.code ?? "error")));

        // Namespace-wide events (not scoped to a joined playlist room) -
        // keep the /playlist list page's Public/Mine tabs live without a
        // manual refresh, regardless of which page the socket connected from.
        socket.on("PLAYLIST_LIST_CREATED", (payload: Playlist) => {
          dispatch(
            playlistApi.util.updateQueryData("getPublicPlaylists", undefined, (draft) => {
              if (!draft.some((p) => p.id === payload.id)) {
                draft.unshift(payload);
              }
            }),
          );
        });
        socket.on("PLAYLIST_LIST_DELETED", (payload: PlaylistListDeletedPayload) => {
          for (const endpoint of ["getPublicPlaylists", "getMyPlaylists"] as const) {
            dispatch(
              playlistApi.util.updateQueryData(endpoint, undefined, (draft) => {
                const index = draft.findIndex((p) => p.id === payload.id);
                if (index !== -1) draft.splice(index, 1);
              }),
            );
          }
        });

        break;
      }

      case PLAYLIST_SOCKET_DISCONNECT: {
        socket?.disconnect();
        socket = null;
        break;
      }

      case PLAYLIST_SOCKET_JOIN: {
        socket?.emit("joinPlaylist", action.payload.playlistId);
        break;
      }

      case PLAYLIST_SOCKET_LEAVE: {
        socket?.emit("leavePlaylist", action.payload.playlistId);
        break;
      }

      default:
        break;
    }

    return next(action);
  };
};

export const connectPlaylistSocket = () => ({ type: PLAYLIST_SOCKET_CONNECT });
export const disconnectPlaylistSocket = () => ({ type: PLAYLIST_SOCKET_DISCONNECT });
export const joinPlaylistRoom = (playlistId: string) => ({
  type: PLAYLIST_SOCKET_JOIN,
  payload: { playlistId },
});
export const leavePlaylistRoom = (playlistId: string) => ({
  type: PLAYLIST_SOCKET_LEAVE,
  payload: { playlistId },
});
