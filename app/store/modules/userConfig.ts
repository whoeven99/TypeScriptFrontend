import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CurrencyDataType } from "~/routes/app.currency/route";

interface UserConfigState {
  locale: string;
}

const initialState: UserConfigState = {
  locale: "",
};

const userConfigSlice = createSlice({
  name: "userConfig",
  initialState,
  reducers: {
    setLocale: (state, action: PayloadAction<string>) => {
      state.locale = action.payload;
    },
  },
});

export const { setLocale } = userConfigSlice.actions;

const reducer = userConfigSlice.reducer;
export default reducer;
