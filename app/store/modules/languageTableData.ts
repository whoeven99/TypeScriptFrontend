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
      // 计算当前最大 key，一次就好
      let nextKey =
        state.rows.reduce((max, r) => {
          const k = typeof r.key === "number" ? r.key : -1;
          return k > max ? k : max;
        }, -1) + 1;

      action.payload.forEach((newData) => {
        const idx = state.rows.findIndex(
          (row) => row.locale === newData.locale,
        );

        if (idx !== -1) {
          // 已存在：保留原有 key，更新数据
          const oldKey = state.rows[idx].key;
          state.rows[idx] = { ...state.rows[idx], ...newData, key: oldKey };
        } else {
          // 不存在：分配全局唯一递增 key
          state.rows.unshift({
            ...newData,
            key: nextKey++,
          });
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
