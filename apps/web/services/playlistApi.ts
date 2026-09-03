import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./authApi";
import {
  ApiResponse,
  Playlist,
  PlaylistInvitationDetail,
  PlaylistLicense,
  PlaylistPreview,
  PlaylistTrackItem,
  PlaylistVisibility,
  UserWithProfile,
} from "@repo/types";

interface CreatePlaylistRequest {
  name: string;
  description?: string;
  visibility?: PlaylistVisibility;
}

interface UpdatePlaylistRequest {
  id: string;
  name: string;
  description?: string;
  visibility: PlaylistVisibility;
  currentVersion: number;
}

export const playlistApi = createApi({
  reducerPath: "playlistApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Playlist", "PlaylistMembers", "PlaylistInvitations"],
  endpoints: (builder) => ({
    createPlaylist: builder.mutation<Playlist, CreatePlaylistRequest>({
      query: (body) => ({ url: "/playlists", method: "POST", body }),
      invalidatesTags: ["Playlist"],
    }),

    getMyPlaylists: builder.query<Playlist[], void>({
      query: () => "/playlists",
      providesTags: ["Playlist"],
    }),

    getPublicPlaylists: builder.query<Playlist[], void>({
      query: () => "/playlists/public",
      providesTags: ["Playlist"],
    }),

    getMyInvitations: builder.query<PlaylistInvitationDetail[], void>({
      query: () => "/playlists/invitations",
      providesTags: ["PlaylistInvitations"],
    }),

    acceptInvitation: builder.mutation<void, string>({
      query: (invitationId) => ({
        url: `/playlists/invitations/${invitationId}/accept`,
        method: "POST",
      }),
      invalidatesTags: ["PlaylistInvitations", "Playlist"],
    }),

    rejectInvitation: builder.mutation<void, string>({
      query: (invitationId) => ({
        url: `/playlists/invitations/${invitationId}/reject`,
        method: "POST",
      }),
      invalidatesTags: ["PlaylistInvitations"],
    }),

    getPlaylistPreview: builder.query<PlaylistPreview, string>({
      query: (id) => `/playlists/${id}/preview`,
      providesTags: (_r, _e, id) => [{ type: "Playlist", id }],
    }),

    updatePlaylist: builder.mutation<Playlist, UpdatePlaylistRequest>({
      query: ({ id, ...body }) => ({ url: `/playlists/${id}`, method: "PUT", body }),
      invalidatesTags: ["Playlist"],
    }),

    uploadCover: builder.mutation<Playlist, { id: string; file: FormData }>({
      query: ({ id, file }) => ({ url: `/playlists/${id}/cover`, method: "POST", body: file }),
      invalidatesTags: ["Playlist"],
    }),

    joinPlaylist: builder.mutation<Playlist, string>({
      query: (id) => ({ url: `/playlists/${id}/join`, method: "POST" }),
      invalidatesTags: ["Playlist", "PlaylistMembers"],
    }),

    leavePlaylist: builder.mutation<void, string>({
      query: (id) => ({ url: `/playlists/${id}/leave`, method: "POST" }),
      invalidatesTags: ["Playlist", "PlaylistMembers"],
    }),

    deletePlaylist: builder.mutation<void, string>({
      query: (id) => ({ url: `/playlists/${id}`, method: "DELETE" }),
      invalidatesTags: ["Playlist"],
    }),

    getLicense: builder.query<PlaylistLicense, string>({
      query: (id) => `/playlists/${id}/license`,
      providesTags: (_r, _e, id) => [{ type: "Playlist", id: `${id}-license` }],
    }),

    updateLicense: builder.mutation<
      PlaylistLicense,
      { id: string; editPolicy: string; isEnabled: boolean }
    >({
      query: ({ id, ...body }) => ({ url: `/playlists/${id}/license`, method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Playlist", id: `${id}-license` }],
    }),

    inviteToPlaylist: builder.mutation<ApiResponse<void>, { id: string; userId: string }>({
      query: ({ id, userId }) => ({
        url: `/playlists/${id}/invitations`,
        method: "POST",
        body: { userId },
      }),
    }),

    getMembers: builder.query<UserWithProfile[], string>({
      query: (id) => `/playlists/${id}/members`,
      providesTags: ["PlaylistMembers"],
    }),

    kickMember: builder.mutation<void, { id: string; userId: string }>({
      query: ({ id, userId }) => ({ url: `/playlists/${id}/members/${userId}`, method: "DELETE" }),
      invalidatesTags: ["PlaylistMembers"],
    }),

    addTracksToPlaylist: builder.mutation<
      { count: number; tracks: PlaylistTrackItem[]; version: number },
      { id: string; trackIds: string[]; currentVersion: number }
    >({
      query: ({ id, ...body }) => ({ url: `/playlists/${id}/tracks`, method: "POST", body }),
    }),

    removeTrackFromPlaylist: builder.mutation<
      { trackId: string; version: number },
      { id: string; trackId: string; currentVersion: number }
    >({
      query: ({ id, trackId, currentVersion }) => ({
        url: `/playlists/${id}/tracks/${trackId}?currentVersion=${currentVersion}`,
        method: "DELETE",
      }),
    }),

    reorderPlaylistTrack: builder.mutation<
      { tracks: { trackId: string; position: number }[]; version: number },
      { id: string; trackId: string; newPosition: number; currentVersion: number }
    >({
      query: ({ id, ...body }) => ({ url: `/playlists/${id}/reorder`, method: "PATCH", body }),
    }),
  }),
});

export const {
  useCreatePlaylistMutation,
  useGetMyPlaylistsQuery,
  useGetPublicPlaylistsQuery,
  useGetMyInvitationsQuery,
  useAcceptInvitationMutation,
  useRejectInvitationMutation,
  useGetPlaylistPreviewQuery,
  useUpdatePlaylistMutation,
  useUploadCoverMutation,
  useJoinPlaylistMutation,
  useLeavePlaylistMutation,
  useDeletePlaylistMutation,
  useGetLicenseQuery,
  useUpdateLicenseMutation,
  useInviteToPlaylistMutation,
  useGetMembersQuery,
  useKickMemberMutation,
  useAddTracksToPlaylistMutation,
  useRemoveTrackFromPlaylistMutation,
  useReorderPlaylistTrackMutation,
} = playlistApi;
