import { apiFetch } from '../api-client';
import type { Event, EventInvitation, Privacy, Licence } from '../types';

export async function listEvents(): Promise<Event[]> {
  const res = (await apiFetch('/api/event/all')) as { data: Event[] };
  return res.data;
}

export function getEvent(id: string): Promise<Event> {
  return apiFetch(`/api/event/${id}`) as Promise<Event>;
}

export function createEvent(input: {
  title: string;
  privacy: Privacy;
  licence: Licence;
  latitude?: number;
  longitude?: number;
  radius?: number;
  geoVotingStart?: Date;
  geoVotingEnd?: Date;
}): Promise<Event> {
  return apiFetch('/api/event/create', { method: 'POST', body: input }) as Promise<Event>;
}

export function joinEvent(id: string): Promise<Event> {
  return apiFetch(`/api/event/join/${id}`, { method: 'POST' }) as Promise<Event>;
}

export function inviteToEvent(eventId: string, userId: string): Promise<unknown> {
  return apiFetch(`/api/event/invite/${eventId}`, { method: 'POST', body: { userId } });
}

export function getMyInvitations(): Promise<EventInvitation[]> {
  return apiFetch('/api/event/invitations') as Promise<EventInvitation[]>;
}

export function acceptInvitation(invitationId: string): Promise<void> {
  return apiFetch(`/api/event/invitations/${invitationId}/accept`, { method: 'POST' }) as Promise<void>;
}

export function rejectInvitation(invitationId: string): Promise<void> {
  return apiFetch(`/api/event/invitations/${invitationId}/reject`, { method: 'POST' }) as Promise<void>;
}

// Adding a track now goes through the socket ('addTrackToEvent' emit, see
// lib/api/socket.ts) instead of REST - the gateway's socket handler broadcasts
// 'eventTracksUpdated' to the whole room so every member sees it live, which
// the plain REST endpoint doesn't do.
