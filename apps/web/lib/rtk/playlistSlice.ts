import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  PlaylistEditPolicy,
  PlaylistInitialState,
  PlaylistPreview,
  PlaylistTrackItem,
  PlaylistVisibility,
} from "@repo/types";

interface PlaylistDetailData {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  visibility: PlaylistVisibility;
  ownerId: string;
  ownerUsername: string;
  version: number;
  tracks: PlaylistTrackItem[];
  editPolicy?: PlaylistEditPolicy;
  isEnabled?: boolean;
  onlineUsernames: string[];
  canEdit: boolean;
  isMember: boolean;
  isOwner: boolean;
  isCollaborative: boolean;
}

interface PlaylistDetailState {
  data: PlaylistDetailData | null;
  isConnected: boolean;
  isJoined: boolean;
  membersDirty: number;
  error: string | null;
  conflict: { message: string; currentVersion: number } | null;
  deleted: boolean;
}

const initialState: PlaylistDetailState = {
  data: null,
  isConnected: false,
  isJoined: false,
  membersDirty: 0,
  error: null,
  conflict: null,
  deleted: false,
};

export const playlistSlice = createSlice({
  name: "playlistDetail",
  initialState,
  reducers: {
    // Called once on mount with SSR-fetched preview data, before the socket
    // has connected - gives the first paint something to render.
    hydratePlaylist(state, action: PayloadAction<PlaylistPreview>) {
      const p = action.payload;
      state.data = {
        id: p.id,
        name: p.name,
        description: p.description,
        coverUrl: p.coverUrl,
        visibility: p.visibility,
        ownerId: p.ownerId,
        ownerUsername: p.owner?.username,
        version: p.version,
        tracks: p.tracks,
        onlineUsernames: [],
        canEdit: p.isOwner,
        isMember: p.isMember,
        isOwner: p.isOwner,
        isCollaborative: p.isCollaborative,
      };
      state.deleted = false;
    },

    socketConnected(state) {
      state.isConnected = true;
    },
    socketDisconnected(state) {
      state.isConnected = false;
      state.isJoined = false;
    },
    roomJoined(state) {
      state.isJoined = true;
    },

    // The server's INITIAL_STATE push on join - the authoritative source of
    // truth (includes canEdit/onlineUsernames the SSR preview doesn't have).
    initialStateReceived(state, action: PayloadAction<PlaylistInitialState>) {
      const s = action.payload;
      state.data = {
        id: s.id,
        name: s.name,
        description: s.description,
        coverUrl: s.coverUrl,
        visibility: s.visibility,
        ownerId: state.data?.ownerId ?? "",
        ownerUsername: state.data?.ownerUsername ?? "",
        version: s.version,
        tracks: s.tracks,
        editPolicy: s.editPolicy,
        isEnabled: s.isEnabled,
        onlineUsernames: s.onlineUsernames,
        canEdit: s.canEdit,
        isMember: s.isMember,
        isOwner: s.isOwner,
        isCollaborative: s.isCollaborative,
      };
      state.deleted = false;
    },

    userOnline(state, action: PayloadAction<{ username: string }>) {
      if (state.data && !state.data.onlineUsernames.includes(action.payload.username)) {
        state.data.onlineUsernames.push(action.payload.username);
      }
    },
    userOffline(state, action: PayloadAction<{ username: string }>) {
      if (state.data) {
        state.data.onlineUsernames = state.data.onlineUsernames.filter(
          (u) => u !== action.payload.username,
        );
      }
    },
    userJoinedRoom(state) {
      state.membersDirty += 1;
    },
    userLeftRoom(state) {
      state.membersDirty += 1;
    },
    memberRemoved(state) {
      state.membersDirty += 1;
    },

    playlistUpdated(
      state,
      action: PayloadAction<{
        name: string;
        description: string | null;
        coverUrl: string | null;
        visibility: PlaylistVisibility;
        version: number;
      }>,
    ) {
      if (state.data) {
        state.data = { ...state.data, ...action.payload };
      }
    },
    editPolicyChanged(
      state,
      action: PayloadAction<{ editPolicy: PlaylistEditPolicy; isEnabled: boolean }>,
    ) {
      if (state.data) {
        state.data.editPolicy = action.payload.editPolicy;
        state.data.isEnabled = action.payload.isEnabled;
        state.data.canEdit =
          state.data.isOwner ||
          (action.payload.isEnabled &&
            action.payload.editPolicy === PlaylistEditPolicy.EVERYONE &&
            state.data.isMember);
      }
    },
    tracksAdded(
      state,
      action: PayloadAction<{ tracks: PlaylistTrackItem[]; version: number }>,
    ) {
      if (state.data) {
        const existingIds = new Set(state.data.tracks.map((t) => t.trackId));
        const fresh = action.payload.tracks.filter((t) => !existingIds.has(t.trackId));
        state.data.tracks = [...state.data.tracks, ...fresh].sort(
          (a, b) => a.position - b.position,
        );
        state.data.version = action.payload.version;
      }
    },
    trackRemoved(state, action: PayloadAction<{ trackId: string; version: number }>) {
      if (state.data) {
        state.data.tracks = state.data.tracks.filter(
          (t) => t.trackId !== action.payload.trackId,
        );
        state.data.version = action.payload.version;
      }
    },
    playlistSynced(
      state,
      action: PayloadAction<{ tracks: { trackId: string; position: number }[]; version: number }>,
    ) {
      if (state.data) {
        const byId = new Map(state.data.tracks.map((t) => [t.trackId, t]));
        state.data.tracks = action.payload.tracks
          .map((t) => {
            const existing = byId.get(t.trackId);
            return existing ? { ...existing, position: t.position } : null;
          })
          .filter((t): t is PlaylistTrackItem => t !== null)
          .sort((a, b) => a.position - b.position);
        state.data.version = action.payload.version;
      }
    },

    playlistDeleted(state) {
      state.deleted = true;
    },

    conflictDetected(state, action: PayloadAction<{ message: string; currentVersion: number }>) {
      state.conflict = action.payload;
    },
    conflictCleared(state) {
      state.conflict = null;
    },

    socketError(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },

    resetPlaylistDetail() {
      return initialState;
    },
  },
});

export const {
  hydratePlaylist,
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
  conflictDetected,
  conflictCleared,
  socketError,
  resetPlaylistDetail,
} = playlistSlice.actions;

export default playlistSlice.reducer;
