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
    setLanguageTableData: (state, action: PayloadAction<any[]>) => {
      state.rows = action.payload;
    },
    updateLanguageTableData: (state, action: PayloadAction<LanguagesDataType[]>) => {
      action.payload.forEach((newData) => {
        const index = state.rows.findIndex(
          (row) => row.locale === newData.locale,
        );

        // 获取 LanguagesDataType 的所有合法 key
        const validKeys = Object.keys(
          state.rows[0] || {},
        ) as (keyof LanguagesDataType)[];

        // 构建仅包含合法字段的新对象
        const filteredData = Object.fromEntries(
          Object.entries(newData).filter(([key]) =>
            validKeys.includes(key as keyof LanguagesDataType),
          ),
        ) as Partial<LanguagesDataType>;

        if (index !== -1) {
          // ✅ 合并更新（仅更新合法字段）
          state.rows[index] = {
            ...state.rows[index],
            ...filteredData,
          };
        } else {
          // ✅ 新增时也只保留合法字段
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
  setLanguageTableData,
  updateLanguageTableData,
  setPublishLoadingState,
  setAutoTranslateState,
  setAutoTranslateLoadingState,
  setPublishState,
  setStatusState,
  setLocaleNameState,
} = languageTableDataSlice.actions;

const reducer = languageTableDataSlice.reducer;
export default reducer;
