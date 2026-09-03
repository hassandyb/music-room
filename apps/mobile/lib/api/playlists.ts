import { Platform } from 'react-native';
import { apiFetch, apiFetchMultipart } from '../api-client';
import type {
  Playlist,
  PlaylistPreview,
  PlaylistTrackEntry,
  PlaylistMemberEntry,
  PlaylistInvitation,
  PlaylistLicense,
  PlaylistVisibility,
  PlaylistEditPolicy,
} from '../types';

export function listMyPlaylists(): Promise<Playlist[]> {
  return apiFetch('/api/playlists') as Promise<Playlist[]>;
}

export function listPublicPlaylists(): Promise<Playlist[]> {
  return apiFetch('/api/playlists/public') as Promise<Playlist[]>;
}

export function getPlaylist(id: string): Promise<Playlist> {
  return apiFetch(`/api/playlists/${id}`) as Promise<Playlist>;
}

export function getPlaylistPreview(id: string): Promise<PlaylistPreview> {
  return apiFetch(`/api/playlists/${id}/preview`) as Promise<PlaylistPreview>;
}

export function createPlaylist(input: {
  name: string;
  description?: string;
  visibility?: PlaylistVisibility;
}): Promise<Playlist> {
  return apiFetch('/api/playlists', { method: 'POST', body: input }) as Promise<Playlist>;
}

export function updatePlaylist(
  id: string,
  input: { name: string; description?: string; visibility: PlaylistVisibility; currentVersion: number }
): Promise<Playlist> {
  return apiFetch(`/api/playlists/${id}`, { method: 'PUT', body: input }) as Promise<Playlist>;
}

export function deletePlaylist(id: string): Promise<void> {
  return apiFetch(`/api/playlists/${id}`, { method: 'DELETE' }) as Promise<void>;
}

export async function uploadPlaylistCover(id: string, uri: string): Promise<Playlist> {
  const filename = uri.split('/').pop() ?? 'cover.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';
  const formData = new FormData();

  if (Platform.OS === 'web') {
    // The {uri, name, type} object below is a React Native-only FormData
    // convention - the browser's real FormData/fetch doesn't understand it
    // and silently stringifies the object instead of attaching bytes, so on
    // web we fetch the picked image ourselves and attach a real Blob.
    const blob = await (await fetch(uri)).blob();
    formData.append('file', blob, filename);
  } else {
    formData.append('file', { uri, name: filename, type } as unknown as Blob);
  }

  return apiFetchMultipart(`/api/playlists/${id}/cover`, formData, { method: 'POST' }) as Promise<Playlist>;
}

export function joinPlaylist(id: string): Promise<Playlist> {
  return apiFetch(`/api/playlists/${id}/join`, { method: 'POST' }) as Promise<Playlist>;
}

export function leavePlaylist(id: string): Promise<{ message: string }> {
  return apiFetch(`/api/playlists/${id}/leave`, { method: 'POST' }) as Promise<{ message: string }>;
}

export function getLicense(id: string): Promise<PlaylistLicense> {
  return apiFetch(`/api/playlists/${id}/license`) as Promise<PlaylistLicense>;
}

export function updateLicense(
  id: string,
  input: { editPolicy: PlaylistEditPolicy; isEnabled: boolean }
): Promise<PlaylistLicense> {
  return apiFetch(`/api/playlists/${id}/license`, { method: 'PUT', body: input }) as Promise<PlaylistLicense>;
}

// Owner-only, requires PREMIUM and an accepted friendship server-side
// (playlist.service.ts's inviteUser) - surface the 402/400 messages as-is.
export function inviteToPlaylist(id: string, userId: string): Promise<PlaylistInvitation> {
  return apiFetch(`/api/playlists/${id}/invitations`, { method: 'POST', body: { userId } }) as Promise<PlaylistInvitation>;
}

export function getMyInvitations(): Promise<PlaylistInvitation[]> {
  return apiFetch('/api/playlists/invitations') as Promise<PlaylistInvitation[]>;
}

export function acceptInvitation(invitationId: string): Promise<void> {
  return apiFetch(`/api/playlists/invitations/${invitationId}/accept`, { method: 'POST' }) as Promise<void>;
}

export function rejectInvitation(invitationId: string): Promise<void> {
  return apiFetch(`/api/playlists/invitations/${invitationId}/reject`, { method: 'POST' }) as Promise<void>;
}

export function getMembers(id: string): Promise<PlaylistMemberEntry[]> {
  return apiFetch(`/api/playlists/${id}/members`) as Promise<PlaylistMemberEntry[]>;
}

export function kickMember(id: string, userId: string): Promise<{ userId: string; username: string }> {
  return apiFetch(`/api/playlists/${id}/members/${userId}`, { method: 'DELETE' }) as Promise<{
    userId: string;
    username: string;
  }>;
}

export function getTracks(id: string): Promise<PlaylistTrackEntry[]> {
  return apiFetch(`/api/playlists/${id}/tracks`) as Promise<PlaylistTrackEntry[]>;
}

export function addTracks(
  id: string,
  trackIds: string[],
  currentVersion: number
): Promise<{ count: number; tracks: PlaylistTrackEntry[]; version: number }> {
  return apiFetch(`/api/playlists/${id}/tracks`, {
    method: 'POST',
    body: { trackIds, currentVersion },
  }) as Promise<{ count: number; tracks: PlaylistTrackEntry[]; version: number }>;
}

export function removeTrack(id: string, trackId: string, currentVersion: number): Promise<{ trackId: string; version: number }> {
  return apiFetch(`/api/playlists/${id}/tracks/${trackId}?currentVersion=${currentVersion}`, {
    method: 'DELETE',
  }) as Promise<{ trackId: string; version: number }>;
}

// Moves a single track to a new 1-indexed position; the backend shifts every
// other track's position to make room and returns the full resulting order.
export function reorderTrack(
  id: string,
  trackId: string,
  newPosition: number,
  currentVersion: number
): Promise<{ tracks: { trackId: string; position: number }[]; version: number }> {
  return apiFetch(`/api/playlists/${id}/reorder`, {
    method: 'PATCH',
    body: { trackId, newPosition, currentVersion },
  }) as Promise<{ tracks: { trackId: string; position: number }[]; version: number }>;
}
