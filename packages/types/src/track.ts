import { UserWithProfile } from "./user";

interface Vote {
    id: string;
    trackId: string;
    userId: string;
    createdAt: string;
    eventId: string
    isWithinRadius: boolean
    latitude: number
    longitude: number
    round: number
    user: UserWithProfile
}


export interface TrackSearch {
    title: string;
    artist: string;
    album: string | null;
    duration: number;
    imageUrl: string | null;
    url: string;
}


export interface Track extends TrackSearch {
    id: string;
    path: string | null;
    source: string;
    createdAt: string;
    votes: Vote[]
}

export interface EventTrack {
    eventId: string
    played: boolean
    order?: number | null
    track: Track
    trackId: string
    votes: Vote[]
}

export type TrackItem = Omit<Track, "createdAt">