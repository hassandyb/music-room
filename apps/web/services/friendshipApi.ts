import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./authApi";
import { Friend, FriendRequest, FriendRequestDetail } from "@repo/types";

export const friendshipApi = createApi({
  reducerPath: "friendshipApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Friends", "FriendRequests"],
  endpoints: (builder) => ({
    getFriends: builder.query<Friend[], void>({
      query: () => "/friendship",
      providesTags: ["Friends"],
    }),

    getIncomingFriendRequests: builder.query<FriendRequestDetail[], void>({
      query: () => "/friendship/requests",
      providesTags: ["FriendRequests"],
    }),

    getSentFriendRequests: builder.query<FriendRequestDetail[], void>({
      query: () => "/friendship/requests/sent",
      providesTags: ["FriendRequests"],
    }),

    sendFriendRequest: builder.mutation<FriendRequest, string>({
      query: (userId) => ({ url: "/friendship/requests", method: "POST", body: { userId } }),
      invalidatesTags: ["FriendRequests"],
    }),

    acceptFriendRequest: builder.mutation<void, string>({
      query: (requestId) => ({ url: `/friendship/requests/${requestId}/accept`, method: "POST" }),
      invalidatesTags: ["Friends", "FriendRequests"],
    }),

    rejectFriendRequest: builder.mutation<void, string>({
      query: (requestId) => ({ url: `/friendship/requests/${requestId}/reject`, method: "POST" }),
      invalidatesTags: ["FriendRequests"],
    }),

    removeFriend: builder.mutation<void, string>({
      query: (userId) => ({ url: `/friendship/${userId}`, method: "DELETE" }),
      invalidatesTags: ["Friends"],
    }),
  }),
});

export const {
  useGetFriendsQuery,
  useGetIncomingFriendRequestsQuery,
  useGetSentFriendRequestsQuery,
  useSendFriendRequestMutation,
  useAcceptFriendRequestMutation,
  useRejectFriendRequestMutation,
  useRemoveFriendMutation,
} = friendshipApi;
