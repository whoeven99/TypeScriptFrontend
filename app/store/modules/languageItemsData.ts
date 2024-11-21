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
    updateData: (state, action: PayloadAction<LanguageItemsDataState[]>) => {
      action.payload.forEach((item) => {
        const index = state.findIndex(
          (existingItem) =>
            existingItem.language === item.language &&
            existingItem.type === item.type,
        );
        if (index !== -1) {
          state[index] = item;
        } else {
          state.push(item);
        }
      });
    },
  },
});

export const { updateData } = languageItemsDataSlice.actions;

const reducer = languageItemsDataSlice.reducer;
export default reducer;
