import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: { resourceType: string } = { resourceType: "" };

const TranslatingResourceTypeSlice = createSlice({
  name: "TranslatingResourceType",
  initialState,
  reducers: {
    updateState: (state, action: PayloadAction<string>) => {
      state.resourceType = action.payload;
    },
  },
});

export const { updateState } = TranslatingResourceTypeSlice.actions;

const reducer = TranslatingResourceTypeSlice.reducer;
export default reducer;
