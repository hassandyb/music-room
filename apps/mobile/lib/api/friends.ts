import { apiFetch } from '../api-client';
import type { FriendRequestDetail, UserSearchResult } from '../types';

// Real, DB-backed friendship system (apps/api/src/friendship). A request must
// be accepted - by the receiver, or automatically if both sides already sent
// one to each other (see friendship.service.ts's sendRequest) - before
// playlist.service.ts's isFriend() check will let you invite someone.
export function listFriends(): Promise<UserSearchResult[]> {
  return apiFetch('/api/friendship') as Promise<UserSearchResult[]>;
}

export function listIncomingRequests(): Promise<FriendRequestDetail[]> {
  return apiFetch('/api/friendship/requests') as Promise<FriendRequestDetail[]>;
}

export function listSentRequests(): Promise<FriendRequestDetail[]> {
  return apiFetch('/api/friendship/requests/sent') as Promise<FriendRequestDetail[]>;
}

export function sendFriendRequest(userId: string) {
  return apiFetch('/api/friendship/requests', { method: 'POST', body: { userId } });
}

export function acceptFriendRequest(requestId: string) {
  return apiFetch(`/api/friendship/requests/${requestId}/accept`, { method: 'POST' });
}

export function rejectFriendRequest(requestId: string): Promise<void> {
  return apiFetch(`/api/friendship/requests/${requestId}/reject`, { method: 'POST' }) as Promise<void>;
}

export function removeFriend(userId: string): Promise<void> {
  return apiFetch(`/api/friendship/${userId}`, { method: 'DELETE' }) as Promise<void>;
}
