import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./authApi";
import { ApiResponse, UserWithProfile } from "@repo/types";


export const userApi = createApi({
    reducerPath: "userApi",
    baseQuery: baseQueryWithReauth,
    tagTypes: ["User"],
    endpoints: (builder) => ({
        searchUsers: builder.query<UserWithProfile[], string>({
            query: (query: string) => ({
                url: `/users/search?query=${query}`,
                method: "GET",
            }),
        }),

    }),
})

export const { useSearchUsersQuery } = userApi;