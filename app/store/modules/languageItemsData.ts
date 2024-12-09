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
      action.payload.forEach((item: LanguageItemsDataState[]) => {
        const index = state.findIndex(
          (existingItem) =>
            existingItem.language === item[0].language &&
            existingItem.type === item[0].type,
        );
        if (index !== -1) {
          state[index] = item[0];
        } else {
          state.push(item[0]);
        }
      });
    },
  },
});

export const { updateData } = languageItemsDataSlice.actions;

const reducer = languageItemsDataSlice.reducer;
export default reducer;
