import { configureStore } from "@reduxjs/toolkit";
import { authApi } from "@/services/authApi";
import { userSlice } from "./userSlice";
import { eventApi } from "@/services/eventApi";
import { eventSlice } from "./eventSlice";
import { socketMiddleware } from "./socketMiddleware";
import { userApi } from "@/services/userApi";
import { playlistApi } from "@/services/playlistApi";
import { playlistSlice } from "./playlistSlice";
import { playlistSocketMiddleware } from "./playlistSocketMiddleware";
import { notificationsSocketMiddleware } from "./notificationsSocketMiddleware";
import { friendshipApi } from "@/services/friendshipApi";

export const makeStore = () => {
  return configureStore({
    reducer: {
      [authApi.reducerPath]: authApi.reducer,
      [userSlice.name]: userSlice.reducer,
      [eventApi.reducerPath]: eventApi.reducer,
      [eventSlice.name]: eventSlice.reducer,
      [userApi.reducerPath]: userApi.reducer,
      [playlistApi.reducerPath]: playlistApi.reducer,
      [playlistSlice.name]: playlistSlice.reducer,
      [friendshipApi.reducerPath]: friendshipApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(
        authApi.middleware,
        eventApi.middleware,
        userApi.middleware,
        playlistApi.middleware,
        friendshipApi.middleware,
        socketMiddleware,
        playlistSocketMiddleware,
        notificationsSocketMiddleware
      ),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
