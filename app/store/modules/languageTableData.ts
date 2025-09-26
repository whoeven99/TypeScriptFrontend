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
    setTableData: (state, action: PayloadAction<any[]>) => {
      state.rows = action.payload;
    },
    updateTableData: (state, action: PayloadAction<LanguagesDataType[]>) => {
      action.payload.forEach((newData, index: number) => {
        // 检查新数据是否已经存在于 state.rows 中
        const data = state.rows.findIndex(
          (row) => row.locale === newData.locale,
        );

        if (data !== -1) {
          // 如果已存在，更新该行的数据
          state.rows[data] = newData;
        } else {
          // 如果不存在，新增数据
          // 将包含 key 的 newData 添加到 rows
          state.rows.unshift(newData);
        }
      });
    },
    setPublishState: (
      state,
      action: PayloadAction<{ locale: string; published: boolean }>,
    ) => {
      const row = state.rows.find(
        (item) => item.locale === action.payload.locale,
      );
      if (row) {
        row.published = action.payload.published;
      }
    },
    setPublishLoadingState: (
      state,
      action: PayloadAction<{ locale: string; loading: boolean }>,
    ) => {
      const row = state.rows.find(
        (item) => item.locale === action.payload.locale,
      );
      if (row) {
        row.publishLoading = action.payload.loading;
      }
    },
    setAutoTranslateState: (
      state,
      action: PayloadAction<{ locale: string; autoTranslate: boolean }>,
    ) => {
      const row = state.rows.find(
        (item) => item.locale === action.payload.locale,
      );
      if (row && typeof action.payload.autoTranslate !== "undefined") {
        row.autoTranslate = action.payload.autoTranslate;
      }
    },
    setAutoTranslateLoadingState: (
      state,
      action: PayloadAction<{ locale: string; loading: boolean }>,
    ) => {
      const row = state.rows.find(
        (item) => item.locale === action.payload.locale,
      );
      if (row) {
        row.autoTranslateLoading = action.payload.loading;
      }
    },

    setStatusState: (
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
    setLocaleNameState: (
      state,
      action: PayloadAction<{ target: string; localeName: string }>,
    ) => {
      const row = state.rows.find(
        (item) => item.locale === action.payload.target,
      );
      if (row) {
        row.localeName = action.payload.localeName;
      }
    },
  },
});

export const {
  setTableData,
  updateTableData,
  setPublishLoadingState,
  setAutoTranslateState,
  setAutoTranslateLoadingState,
  setPublishState,
  setStatusState,
  setLocaleNameState,
} = languageTableDataSlice.actions;

const reducer = languageTableDataSlice.reducer;
export default reducer;
