import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UserConfigState {
  shop: string;
  locale: string;
  plan: number;
  updateTime: string;
  chars: number | undefined;
  totalChars: number | undefined;
  userConfigIsLoading: boolean;
}

const initialState: UserConfigState = {
  shop: "",
  locale: "",
  plan: 0,
  updateTime: "",
  chars: 0,
  totalChars: 0,
  userConfigIsLoading: true,
};

const userConfigSlice = createSlice({
  name: "userConfig",
  initialState,
  reducers: {
    setPlan: (state, action: PayloadAction<{ plan: number }>) => {
      state.plan = action.payload.plan;
    },
    setUpdateTime: (state, action: PayloadAction<{ updateTime: string }>) => {
      state.updateTime = action.payload.updateTime;
    },
    setShop: (state, action: PayloadAction<{ shop: string }>) => {
      state.shop = action.payload.shop;
    },
    setLocale: (state, action: PayloadAction<{ locale: string }>) => {
      state.locale = action.payload.locale;
    },
    setChars: (state, action: PayloadAction<{ chars: number | undefined }>) => {
      state.chars = action.payload.chars;
    },
    setTotalChars: (state, action: PayloadAction<{ totalChars: number | undefined }>) => {
      state.totalChars = action.payload.totalChars;
    },
    setUserConfigIsLoading: (
      state,
      action: PayloadAction<{ isLoading: boolean }>,
    ) => {
      state.userConfigIsLoading = action.payload.isLoading;
    },
  },
});

export const {
  setPlan,
  setUpdateTime,
  setShop,
  setLocale,
  setChars,
  setTotalChars,
  setUserConfigIsLoading,
} = userConfigSlice.actions;

const reducer = userConfigSlice.reducer;
export default reducer;
