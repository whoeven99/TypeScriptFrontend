import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface LanguageItemsDataState {
  language: string;
  translatedNumber: number;
  totalNumber: number;
}

const initialState: LanguageItemsDataState[] = [];

const languageItemsDataSlice = createSlice({
  name: "LanguageItemsData",
  initialState,
  reducers: {
    updateData: (state, action: PayloadAction<LanguageItemsDataState>) => {
      const index = state.findIndex(
        (item) => item.language === action.payload.language,
      );

      if (index !== -1) {
        // 如果找到了该对象，更新它
        state[index] = action.payload;
      } else {
        // 如果没有找到该对象，添加新的对象
        state.push(action.payload);
      }
    },
    // setPublishConfirmState: (
    //   state,
    //   action: PayloadAction<{
    //     key: number;
    //     published: boolean;
    //     loading: boolean;
    //   }>,
    // ) => {
    //   const row = state.rows.find((item) => item.key === action.payload.key);
    //   if (row) {
    //     row.loading = action.payload.loading;
    //     row.published = action.payload.published;
    //   }
    // },
    // setPublishState: (
    //   state,
    //   action: PayloadAction<{ key: number; published: boolean }>,
    // ) => {
    //   const row = state.rows.find((item) => item.key === action.payload.key);
    //   if (row) {
    //     row.published = action.payload.published;
    //   }
    // },
    // setPublishLoadingState: (
    //   state,
    //   action: PayloadAction<{ key: number; loading: boolean }>,
    // ) => {
    //   const row = state.rows.find((item) => item.key === action.payload.key);
    //   if (row) {
    //     row.loading = action.payload.loading;
    //   }
    // },
    // setStatuState: (
    //   state,
    //   action: PayloadAction<{ key: number; status: number }>,
    // ) => {
    //   const row = state.rows.find((item) => item.key === action.payload.key);
    //   if (row) {
    //     row.status = action.payload.status;
    //   }
    // },
  },
});

export const { updateData } = languageItemsDataSlice.actions;

const reducer = languageItemsDataSlice.reducer;
export default reducer;
