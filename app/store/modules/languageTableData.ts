import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { LanguagesDataType } from "~/routes/app.language/route";

interface LanguageTableDataState {
  rows: LanguagesDataType[];
}

const initialState: LanguageTableDataState = {
  rows: [],
};

const languageTableDataSlice = createSlice({
  name: "languageTableData",
  initialState,
  reducers: {
    setTableData: (state, action: PayloadAction<LanguagesDataType[]>) => {
      state.rows = action.payload;
    },
    setPublishConfirmState: (
      state,
      action: PayloadAction<{ key: number; published: boolean; loading: boolean }>,
    ) => {
      const row = state.rows.find((item) => item.key === action.payload.key);
      if (row) {
        row.loading = action.payload.loading;
        row.published = action.payload.published;
      }
    },
    setPublishState: (
      state,
      action: PayloadAction<{ key: number; published: boolean }>,
    ) => {
      const row = state.rows.find((item) => item.key === action.payload.key);
      if (row) {
        row.published = action.payload.published;
      }
    },
    setPublishLoadingState: (
      state,
      action: PayloadAction<{ key: number; loading: boolean }>,
    ) => {
      const row = state.rows.find((item) => item.key === action.payload.key);
      if (row) {
        row.loading = action.payload.loading;
      }
    },
  },
});

export const { setTableData, setPublishConfirmState, setPublishLoadingState, setPublishState } = languageTableDataSlice.actions;

const reducer = languageTableDataSlice.reducer;
export default reducer;
