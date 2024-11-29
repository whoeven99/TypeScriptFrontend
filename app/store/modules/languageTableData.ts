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
    updateTableData: (state, action: PayloadAction<LanguagesDataType[]>) => {
      action.payload.forEach((newData) => {
        // 检查新数据是否已经存在于 state.rows 中
        const index = state.rows.findIndex((row) => row.locale === newData.locale);

        if (index !== -1) {
          // 如果已存在，更新该行的数据
          state.rows[index] = newData;
        } else {
          // 如果不存在，新增数据
          state.rows.push(newData);
        }
      });
    },
    setPublishConfirmState: (
      state,
      action: PayloadAction<{
        key: number;
        published: boolean;
        loading: boolean;
      }>,
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
    setStatuState: (
      state,
      action: PayloadAction<{ target: string; status: number }>,
    ) => {
      const row = state.rows.find(
        (item) => item.locale === action.payload.target,
      );
      if (row) {
        row.status = action.payload.status;
      }
    },
  },
});

export const {
  setTableData,
  updateTableData,
  setPublishConfirmState,
  setPublishLoadingState,
  setPublishState,
  setStatuState,
} = languageTableDataSlice.actions;

const reducer = languageTableDataSlice.reducer;
export default reducer;
