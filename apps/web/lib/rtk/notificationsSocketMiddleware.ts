import { Middleware } from "@reduxjs/toolkit";
import { io, Socket } from "socket.io-client";
import { playlistApi } from "@/services/playlistApi";
import { friendshipApi } from "@/services/friendshipApi";
import { eventApi } from "@/services/eventApi";

export const NOTIFICATIONS_SOCKET_CONNECT = "notificationsSocket/connect";
export const NOTIFICATIONS_SOCKET_DISCONNECT = "notificationsSocket/disconnect";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

export const notificationsSocketMiddleware: Middleware = (store) => {
  const dispatch = store.dispatch as (action: any) => void;
  let socket: Socket | null = null;

  return (next) => (action: any) => {
    switch (action.type) {
      case NOTIFICATIONS_SOCKET_CONNECT: {
        if (socket?.connected) return next(action);

        socket = io(`${SOCKET_URL}/notifications`, {
          path: "/socket.io",
          withCredentials: true,
          transports: ["websocket", "polling"],
        });

        // Personal per-user channel - no INITIAL_STATE, only live deltas on
        // top of a REST fetch the consuming component already does.
        socket.on("PLAYLIST_INVITATION_RECEIVED", () => {
          dispatch(playlistApi.util.invalidateTags(["PlaylistInvitations"]));
        });
        socket.on("FRIEND_REQUEST_RECEIVED", () => {
          dispatch(friendshipApi.util.invalidateTags(["FriendRequests"]));
        });
        socket.on("EVENT_INVITATION_RECEIVED", () => {
          dispatch(eventApi.util.invalidateTags(["EventInvitations"]));
        });

        break;
      }

      case NOTIFICATIONS_SOCKET_DISCONNECT: {
        socket?.disconnect();
        socket = null;
        break;
      }

      default:
        break;
    }

    return next(action);
  };
};

export const connectNotificationsSocket = () => ({ type: NOTIFICATIONS_SOCKET_CONNECT });
export const disconnectNotificationsSocket = () => ({ type: NOTIFICATIONS_SOCKET_DISCONNECT });
