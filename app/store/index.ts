import languageTableDataSlice from "./modules/languageTableData";
import currencyTableDataSlice from "./modules/currencyTableData"
import selectLanguageDataSlice from "./modules/selectLanguageData"
import { configureStore } from "@reduxjs/toolkit";

const store = configureStore({
  reducer: {
    languageTableData: languageTableDataSlice,
    currencyTableData: currencyTableDataSlice,
    selectLanguageData: selectLanguageDataSlice,
  },
});

export default store;
export type RootState = ReturnType<typeof store.getState>;
