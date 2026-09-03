import type { PlaylistVisibility } from "./playlist";

export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: string;
}

export interface UserWithProfile extends User {
  profile: Profile;
}

export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  subscription: Subscription;
  createdAt: string;
  searchPreference: string;
}

export interface CreateProfile {
  avatar: any;
  firstName: string;
  lastName: string;
  searchPreferences: string;
}

export interface ProfileStats {
  events: number;
  playlists: number;
  votes: number;
}

export interface RecentEventSummary {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  live: boolean;
}

export interface RecentPlaylistSummary {
  id: string;
  name: string;
  createdAt: string;
  visibility: PlaylistVisibility;
}

export interface ProfileData extends UserWithProfile {
  stats: ProfileStats;
  recentEvents: RecentEventSummary[];
  recentPlaylists: RecentPlaylistSummary[];
}

export enum Subscription {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
}
