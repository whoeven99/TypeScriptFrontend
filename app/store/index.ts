import languageTableDataSlice from "./modules/languageTableData";
import currencyTableDataSlice from "./modules/currencyTableData"
import { configureStore } from "@reduxjs/toolkit";

const store = configureStore({
  reducer: {
    languageTableData: languageTableDataSlice,
    currencyTableData: currencyTableDataSlice,
  },
});

export default store;
export type RootState = ReturnType<typeof store.getState>;
