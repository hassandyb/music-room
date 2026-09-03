
import { EventTrack, Track, TrackItem } from "./track";
import { UserWithProfile } from "./user";


export interface Event {
    id: string;
    title: string;
    createdById: string;
    createdBy: {
        id: string
        username: string;
    };
    latitude?: number;
    longitude?: number;
    radius?: number;
    status: EventStatus;
    tracks: EventTrack[];
    licence: Licence;
    privacy: Privacy;
    currentTrackStartTime?: string | null;
    currentTrackId: string | null;
    currentTrack: Track | null;
    round?: number
    geoVotingStart?: Date
    geoVotingEnd?: Date
}


export enum Privacy {
    PUBLIC = 'PUBLIC',
    PRIVATE = 'PRIVATE',
}

export enum Licence {
    FREE = 'FREE',
    INVITE_ONLY = 'INVITE_ONLY',
    GEOTIME = 'GEOTIME',
}

export enum EventStatus {
    CREATED = 'CREATED',
    VOTING = 'VOTING',
    PLAYING = 'PLAYING',
    FINISHED = 'FINISHED',
}

export interface EventMember extends UserWithProfile {
    isOnline: boolean;
}

export interface EventData extends Event {
    members: EventMember[];
}

// event update actions
export interface EventMembersUpdated {
    members: UserWithProfile[];
}

export interface EventTracksUpdated {
    tracks: TrackItem[];
}

export interface EventStatusUpdated {
    status: EventStatus;
}



// enums
export enum EventInviteStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
}

export interface EventInvitation {
    id: string;
    eventId: string;
    userId: string;
    createdAt: string;
}

export interface EventInvitationDetail extends EventInvitation {
    eventName: string;
    creatorUsername: string;
}

export interface EventInvitationReceivedPayload {
    id: string;
    eventId: string;
    eventName: string;
    creatorUsername: string;
}
