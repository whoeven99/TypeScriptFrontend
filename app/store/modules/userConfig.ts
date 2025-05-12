import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CurrencyDataType } from "~/routes/app.currency/route";

interface UserConfigState {
  locale: string;
  plan: string;
  updateTime: string;
}

const initialState: UserConfigState = {
  locale: "",
  plan: "",
  updateTime: "",
};

const userConfigSlice = createSlice({
  name: "userConfig",
  initialState,
  reducers: {
    setUserConfig: (state, action: PayloadAction<{[key: string]: string}>) => {
      if (action.payload.locale !== undefined) {
        state.locale = action.payload.locale;
      }
      if (action.payload.plan !== undefined) {
        state.plan = action.payload.plan;
      }
      if (action.payload.updateTime !== undefined) {
        state.updateTime = action.payload.updateTime;
      }
    },
  },
});

export const { setUserConfig } = userConfigSlice.actions;

const reducer = userConfigSlice.reducer;
export default reducer;
