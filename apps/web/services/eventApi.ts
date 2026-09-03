import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./authApi";
import { ApiResponse, Event, EventInvitationDetail, Track } from "@repo/types";


interface CreateEventRequest extends Partial<Omit<Event, "id" | "createdById" | "status" | "tracks" | "createdBy" | "currentTrackId" | "currentTrack" | "startTime" | "round">> { }

export const eventApi = createApi({
    reducerPath: "eventApi",
    baseQuery: baseQueryWithReauth,
    tagTypes: ["Event", "Track", "EventInvitations"],
    endpoints: (builder) => ({
        createEvent: builder.mutation<ApiResponse<Event>, CreateEventRequest>({
            query: (eventData) => ({
                url: "/event/create",
                method: "POST",
                body: eventData,
            }),
        }),
        searchTrack: builder.query<Track[], string>({
            query: (query: string) => ({
                url: `/track/search?query=${query}`,
                method: "GET",
            }),
        }),
        fetchTracks: builder.query<Track[], void>({
            query: () => ({
                url: `/track/tracks`,
                method: "GET",
            }),
            providesTags: ["Track"],
        }),
        addTrack: builder.mutation<ApiResponse<Event>, { eventId: string, trackId: string }>({
            query: ({ eventId, trackId }) => ({
                url: `/event/${eventId}/add-track`,
                method: "POST",
                body: { trackId },
            }),

        }),
        sendInvite: builder.mutation<ApiResponse<void>, { eventId: string, userId: string }>({
            query: ({ eventId, userId }) => ({
                url: `/event/invite/${eventId}`,
                method: "POST",
                body: { userId },
            }),
        }),

        getMyEventInvitations: builder.query<EventInvitationDetail[], void>({
            query: () => "/event/invitations",
            providesTags: ["EventInvitations"],
        }),

        acceptEventInvitation: builder.mutation<void, string>({
            query: (invitationId) => ({
                url: `/event/invitations/${invitationId}/accept`,
                method: "POST",
            }),
            invalidatesTags: ["EventInvitations", "Event"],
        }),

        rejectEventInvitation: builder.mutation<void, string>({
            query: (invitationId) => ({
                url: `/event/invitations/${invitationId}/reject`,
                method: "POST",
            }),
            invalidatesTags: ["EventInvitations"],
        }),

    }),
});

export const {
    useCreateEventMutation,
    useSearchTrackQuery,
    useAddTrackMutation,
    useSendInviteMutation,
    useFetchTracksQuery,
    useGetMyEventInvitationsQuery,
    useAcceptEventInvitationMutation,
    useRejectEventInvitationMutation,
} = eventApi;