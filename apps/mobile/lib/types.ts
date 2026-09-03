// Local types mirroring the real backend shapes (apps/api/prisma/schema.prisma +
// controller/gateway responses). We intentionally do NOT depend on @repo/types
// here: it has drifted from what the API actually returns in a few places
// (e.g. its EventMembersUpdated/Vote shapes assume a nested `user` object with
// `email`, but the real runtime shape from event.service.ts's getEventById()
// transform and event.gateway.ts's eventMembers() helper is flatter and omits
// email). Keeping mobile's types hand-verified against the real
// controllers/services avoids inheriting that drift.

export type Privacy = 'PUBLIC' | 'PRIVATE';
export type Licence = 'FREE' | 'INVITE_ONLY' | 'GEOTIME';
// Event lifecycle: CREATED (no round started) -> VOTING (round open, ~20s
// window server-side) -> PLAYING (highest-voted unplayed track playing for
// its full duration) -> back to VOTING for the next round, or FINISHED once
// every track has been played.
export type EventStatus = 'CREATED' | 'VOTING' | 'PLAYING' | 'FINISHED';
export type EventInviteStatus = 'PENDING' | 'ACCEPTED';
export type Subscription = 'FREE' | 'PREMIUM';

export interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  location: string | null;
  subscription: Subscription;
  // Raw string as sent to POST/PUT /profile's `searchPreferences` field
  // (profile.service.ts stores it verbatim as Profile.searchPreference) -
  // treat its internal format as opaque free text, not JSON, unless/until
  // the backend actually parses it into something structured.
  searchPreference: string | null;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  isActivated: boolean;
  googleId: string | null;
  facebookId: string | null;
  createdAt: string;
  profile: Profile | null;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  imageUrl: string | null;
  duration: number;
  path: string | null;
  createdAt: string;
}

export interface Vote {
  id: string;
  trackId: string;
  eventId: string;
  userId: string;
  round: number;
  latitude: number;
  longitude: number;
  isWithinRadius: boolean;
  createdAt: string;
  user: { id: string; username: string; profile: Profile | null };
}

// The Event <-> Track relation is now a join model (EventTrack) tracking
// per-event play state, not a plain many-to-many. `track` and `votes` are only
// populated by the detail endpoint (GET /event/:id) and socket payloads - the
// list endpoint (GET /event/all) returns bare {eventId,trackId,played,order}
// rows, so treat them as optional.
export interface EventTrack {
  eventId: string;
  trackId: string;
  played: boolean;
  order: number | null;
  track?: Track;
  votes?: Vote[];
}

// Flat shape - event.service.ts's getEventById() and event.gateway.ts's
// eventMembers() both return {id, username, profile, isOnline?} directly,
// NOT nested under a `user` key.
export interface EventMemberEntry {
  id: string;
  username: string;
  profile: Profile | null;
  isOnline?: boolean;
}

export interface Event {
  id: string;
  title: string;
  createdById: string;
  // GET /event/all only selects {username}; GET /event/:id selects {id, username}.
  createdBy: { id?: string; username: string };
  latitude: number;
  longitude: number;
  radius: number;
  status: EventStatus;
  privacy: Privacy;
  licence: Licence;
  round: number;
  startTime: string | null;
  // Only present on the initial GET /event/:id (or the joinRoom-triggered
  // 'eventDetails' broadcast) payload, which spreads the raw DB row - the
  // incremental 'eventUpdated' broadcasts from playTrackEvent/advanceEvent
  // rename this to `startTime` instead. Read both when checking playback time.
  currentTrackStartTime?: string | null;
  currentTrackId: string | null;
  geoVotingStart: string | null;
  geoVotingEnd: string | null;
  // Only populated by the detail endpoint/socket payloads, not the list endpoint.
  currentTrack?: Track | null;
  tracks: EventTrack[];
  members?: EventMemberEntry[];
}

export interface EventInvitation {
  id: string;
  eventId: string;
  userId: string;
  createdAt: string;
  eventName: string;
  creatorUsername: string;
}

export interface UserSearchResult {
  id: string;
  username: string;
  email: string;
  profile: Profile | null;
}

export type PlaylistVisibility = 'PUBLIC' | 'PRIVATE';
// EVERYONE = any member can edit tracks while isEnabled is true; INVITED_ONLY
// restricts editing to the owner regardless (see playlist.gateway.ts's canEdit
// derivation). isEnabled is a kill switch independent of editPolicy.
export type PlaylistEditPolicy = 'EVERYONE' | 'INVITED_ONLY';

// Shape returned by playlist.service.ts's toPlaylistDto() - every list/get/
// create/update/cover endpoint. isCollaborative reflects the OWNER's plan
// (PREMIUM), not the viewing user's - it's what gates whether ANYONE besides
// the owner can join/be invited to this specific playlist.
export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  visibility: PlaylistVisibility;
  ownerId: string;
  owner: { id: string; username: string };
  version: number;
  memberCount: number;
  trackCount: number;
  isCollaborative: boolean;
  createdAt: string;
  updatedAt: string;
}

// PlaylistTrack join row with the catalog Track included - every endpoint
// that returns tracks (preview, GET tracks, TRACKS_ADDED broadcast) includes it.
export interface PlaylistTrackEntry {
  id: string;
  playlistId: string;
  trackId: string;
  position: number;
  createdAt: string;
  track: Track;
}

// GET /api/playlists/:id/preview - base Playlist plus the viewer's
// membership and the full ordered track list, in one call.
export interface PlaylistPreview extends Playlist {
  isOwner: boolean;
  isMember: boolean;
  tracks: PlaylistTrackEntry[];
}

export interface PlaylistMemberEntry {
  id: string;
  username: string;
  profile: Profile | null;
}

export interface PlaylistInvitation {
  id: string;
  playlistId: string;
  userId: string;
  createdAt: string;
  playlistName: string;
  ownerUsername: string;
}

export interface PlaylistLicense {
  id: string;
  playlistId: string;
  editPolicy: PlaylistEditPolicy;
  isEnabled: boolean;
}

// Socket payloads - apps/api/src/playlist/playlist.gateway.ts. Sent right
// after a `joinPlaylist` emit; canEdit/isMember/isOwner/onlineUsernames have
// no REST equivalent, so the detail screen only knows them once connected.
export interface PlaylistInitialState {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  visibility: PlaylistVisibility;
  editPolicy: PlaylistEditPolicy;
  isEnabled: boolean;
  version: number;
  tracks: PlaylistTrackEntry[];
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

export interface TracksAddedPayload {
  count: number;
  tracks: PlaylistTrackEntry[];
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

export interface EditPolicyChangedPayload {
  editPolicy: PlaylistEditPolicy;
  isEnabled: boolean;
}

export interface MemberRemovedPayload {
  userId: string;
  username: string;
}

export type FriendRequestStatus = 'PENDING' | 'ACCEPTED';

// Matches friendship.service.ts's listIncomingRequests/listSentRequests shape -
// only the side relevant to the query is populated (senderUsername on incoming,
// receiverUsername on sent), the other comes back as ''.
export interface FriendRequestDetail {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  createdAt: string;
  senderUsername: string;
  receiverUsername: string;
}
