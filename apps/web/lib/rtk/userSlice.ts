import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { UserWithProfile } from "@repo/types";

interface userState {
  user: UserWithProfile | null;
}

const initialState: userState = {
  user: null,
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserWithProfile | null>) => {
      state.user = action.payload;
    },
    updateUser: (state, action: PayloadAction<Partial<UserWithProfile>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
});

export const { setUser, updateUser } = userSlice.actions;
export default userSlice.reducer;
