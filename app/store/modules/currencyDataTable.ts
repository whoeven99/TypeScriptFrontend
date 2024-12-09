import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CurrencyDataType } from "~/routes/app.currency/route";

interface CurrencyTableDataState {
  rows: CurrencyDataType[];
}

const initialState: CurrencyTableDataState = {
  rows: [],
};

const currencyTableDataSlice = createSlice({
  name: "languageTableData",
  initialState,
  reducers: {
    setTableData: (state, action: PayloadAction<CurrencyDataType[]>) => {
      state.rows = action.payload;
    },
  },
});

export const { setTableData } = currencyTableDataSlice.actions;

const reducer = currencyTableDataSlice.reducer;
export default reducer;