import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: { count: number } = { count: 0 };

const TotalCharactersSlice = createSlice({
  name: "TotalCharacters",
  initialState,
  reducers: {
    updateNumber: (state, action: PayloadAction<number>) => {
      state.count = action.payload;
    },
  },
});

export const { updateNumber } = TotalCharactersSlice.actions;

const reducer = TotalCharactersSlice.reducer;
export default reducer;
