"use client"

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/rtk/hooks";
import { connectNotificationsSocket, disconnectNotificationsSocket } from "@/lib/rtk/notificationsSocketMiddleware";

// Connects the personal /notifications channel for the whole dashboard
// (not just the playlist pages) so friend-request and playlist-invitation
// pushes reach the user regardless of which page they're on - e.g. the
// Friends panel on the profile page.
export function NotificationsProvider() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(connectNotificationsSocket());
    return () => {
      dispatch(disconnectNotificationsSocket());
    };
  }, [dispatch]);

  return null;
}
