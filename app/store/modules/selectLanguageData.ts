import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface SelectLanguageDataState {
  key: string;
}

const initialState: SelectLanguageDataState = {
  key: "",
};

const selectLanguageDataSlice = createSlice({
  name: "selectLanguageData",
  initialState,
  reducers: {
    setSelectLanguageData: (state, action: PayloadAction<string>) => {
      state.key = action.payload;
    },
  },
});

export const { setSelectLanguageData } = selectLanguageDataSlice.actions;

const reducer = selectLanguageDataSlice.reducer;
export default reducer;
