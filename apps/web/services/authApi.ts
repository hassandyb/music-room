import { AuthResponse, LoginRequest, RegisterRequest } from "@/types/auth";

import { BaseQueryFn } from "@reduxjs/toolkit/query";
import { FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { ApiResponse, Subscription, UserWithProfile } from "@repo/types";

const baseQuery = fetchBaseQuery({
  baseUrl: `${process.env.NEXT_PUBLIC_API_URL}/api`,
  credentials: "include",
});

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);

  // if (result.error?.status === 401) {
  //   window.location.href = "/login";
  // }

  return result;
};

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["User"],
  endpoints: (builder) => ({
    login: builder.mutation<ApiResponse<UserWithProfile>, LoginRequest>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
    }),

    register: builder.mutation<ApiResponse<null>, RegisterRequest>({
      query: (userData) => ({
        url: "/auth/register",
        method: "POST",
        body: userData,
      }),
    }),

    logout: builder.mutation<void, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      invalidatesTags: ["User"],
    }),

    getCurrentUser: builder.query<UserWithProfile, void>({
      query: () => "/auth/me",
      providesTags: ["User"],
    }),

    forgotPassword: builder.mutation<ApiResponse<null>, { email: string }>({
      query: (data) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body: data,
      }),
    }),

    resetPassword: builder.mutation<
      void,
      { token: string; password: string; confirmPassword: string }
    >({
      query: ({ token, password, confirmPassword }) => ({
        url: "/auth/reset-password",
        method: "POST",
        body: { token, password, confirmPassword },
      }),
    }),

    // verifyEmail: builder.mutation<void, { token: string }>({
    //   query: ({ token }) => ({
    //     url: "/verify-email",
    //     method: "POST",
    //     body: { token },
    //   }),
    // }),

    createProfile: builder.mutation<UserWithProfile, FormData>({
      query: (formData) => ({
        url: "/profile",
        method: "POST",
        body: formData,
      }),
    }),

    updateProfile: builder.mutation<UserWithProfile, FormData>({
      query: (formData) => ({
        url: "/profile",
        method: "PUT",
        body: formData,
      }),
      invalidatesTags: ["User"],
    }),

    updateSubscription: builder.mutation<{ subscription: Subscription }, Subscription>({
      query: (subscription) => ({
        url: "/profile/subscription",
        method: "PATCH",
        body: { subscription },
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

// Export hooks
export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetCurrentUserQuery,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useCreateProfileMutation,
  useUpdateProfileMutation,
  useUpdateSubscriptionMutation,
} = authApi;
