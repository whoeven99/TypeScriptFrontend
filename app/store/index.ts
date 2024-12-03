import languageTableDataSlice from "./modules/languageTableData";
import languageItemsDataSlice from "./modules/languageItemsData"
import selectLanguageDataSlice from "./modules/selectLanguageData"
import currencyTableDataSlice from "./modules/currencyTableData"
import { configureStore } from "@reduxjs/toolkit";

const store = configureStore({
  reducer: {
    languageTableData: languageTableDataSlice,
    languageItemsData: languageItemsDataSlice,
    selectLanguageData: selectLanguageDataSlice,
    currencyTableData:currencyTableDataSlice
  },
});

export default store;
export type RootState = ReturnType<typeof store.getState>;
