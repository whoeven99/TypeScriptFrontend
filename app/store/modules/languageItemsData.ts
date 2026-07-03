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
      for (const row of action.payload) {
        const index = state.findIndex(
          (existingItem) =>
            existingItem?.language === row.language &&
            existingItem?.type === row.type,
        );
        if (index !== -1) {
          state[index] = row;
        } else {
          state.push(row);
        }
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
