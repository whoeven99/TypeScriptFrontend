import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface LanguageItemsDataState {
  language: string;
  type: string;
  translatedNumber: number;
  totalNumber: number;
}

const initialState: LanguageItemsDataState[] = [];

const languageItemsDataSlice = createSlice({
  name: "LanguageItemsData",
  initialState,
  reducers: {
    updateData: (state, action: PayloadAction<any[]>) => {
      const index = state.findIndex(
        (existingItem) =>
          existingItem?.language === action.payload[0].language &&
          existingItem?.type === action.payload[0].type,
      );
      if (index !== -1) {
        state[index] = action.payload[0];
      } else {
        state.push(action.payload[0]);
      }
    },
    /** 刷新统计前清空某语言缓存，让汇总页显示 Syncing 而非旧数字。 */
    clearLocaleStats: (state, action: PayloadAction<string>) => {
      const locale = action.payload;
      return state.filter((item) => item.language !== locale);
    },
  },
});

export const { updateData, clearLocaleStats } = languageItemsDataSlice.actions;

const reducer = languageItemsDataSlice.reducer;
export default reducer;
