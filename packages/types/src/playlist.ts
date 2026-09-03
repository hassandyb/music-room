import { UserWithProfile } from "./user";
import { Track } from "./track";

export enum PlaylistVisibility {
    PUBLIC = 'PUBLIC',
    PRIVATE = 'PRIVATE',
}

export enum PlaylistEditPolicy {
    EVERYONE = 'EVERYONE',
    INVITED_ONLY = 'INVITED_ONLY',
}

export interface Playlist {
    id: string;
    name: string;
    description: string | null;
    coverUrl: string | null;
    visibility: PlaylistVisibility;
    ownerId: string;
    owner: {
        id: string;
        username: string;
    };
    version: number;
    memberCount: number;
    trackCount: number;
    // true iff the owner is on a paid plan - lets the UI hide/disable
    // collaboration affordances (invite, join-by-others) ahead of a 402.
    isCollaborative: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PlaylistMember extends UserWithProfile {
    isOnline?: boolean;
}

export interface PlaylistTrackItem {
    id: string;
    playlistId: string;
    trackId: string;
    position: number;
    track: Omit<Track, 'votes'>;
    createdAt: string;
}

export interface PlaylistLicense {
    id: string;
    playlistId: string;
    editPolicy: PlaylistEditPolicy;
    isEnabled: boolean;
}

export interface PlaylistInvitation {
    id: string;
    playlistId: string;
    userId: string;
    createdAt: string;
}

export interface PlaylistInvitationDetail extends PlaylistInvitation {
    playlistName: string;
    ownerUsername: string;
}

export interface PlaylistPreview extends Playlist {
    isOwner: boolean;
    isMember: boolean;
    tracks: PlaylistTrackItem[];
}

// WebSocket payloads - playlist room (/playlist namespace)

export interface PlaylistInitialState {
    id: string;
    name: string;
    description: string | null;
    coverUrl: string | null;
    visibility: PlaylistVisibility;
    editPolicy: PlaylistEditPolicy;
    isEnabled: boolean;
    version: number;
    tracks: PlaylistTrackItem[];
    onlineUsernames: string[];
    canEdit: boolean;
    isMember: boolean;
    isOwner: boolean;
    isCollaborative: boolean;
}

export interface PlaylistUpdatedPayload {
    name: string;
    description: string | null;
    coverUrl: string | null;
    visibility: PlaylistVisibility;
    version: number;
}

export interface EditPolicyChangedPayload {
    editPolicy: PlaylistEditPolicy;
    isEnabled: boolean;
}

export interface TracksAddedPayload {
    count: number;
    tracks: PlaylistTrackItem[];
    version: number;
}

export interface TrackRemovedPayload {
    trackId: string;
    version: number;
}

export interface PlaylistSyncPayload {
    tracks: { trackId: string; position: number }[];
    version: number;
}

export interface MemberRemovedPayload {
    userId: string;
    username: string;
}

export interface PlaylistInvitationReceivedPayload {
    id: string;
    playlistId: string;
    playlistName: string;
    ownerUsername: string;
}

// WS payloads - broadcast namespace-wide on the /playlist socket (not
// scoped to a single playlist's room) so the list page can stay live.

export interface PlaylistListDeletedPayload {
    id: string;
}

// WS close reasons for the playlist room - emitted as an 'error' event
// (not a raw ws close code, see the gateway for why) before disconnecting.
export enum PlaylistSocketCloseReason {
    UNAUTHENTICATED = 'UNAUTHENTICATED',
    PLAYLIST_NOT_FOUND = 'PLAYLIST_NOT_FOUND',
    FORBIDDEN = 'FORBIDDEN',
}
