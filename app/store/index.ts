import languageTableDataSlice from "./modules/languageTableData";
import languageItemsDataSlice from "./modules/languageItemsData";
import selectLanguageDataSlice from "./modules/selectLanguageData";
import currencyTableDataSlice from "./modules/currencyDataTable";
import glossaryTableDataSlice from "./modules/glossaryTableData"
import TotalCharactersSlice from "./modules/totalCharacters";
import translatingResourceTypeSlice from "./modules/translatingResourceType";
import { configureStore } from "@reduxjs/toolkit";

const store = configureStore({
  reducer: {
    languageTableData: languageTableDataSlice,
    languageItemsData: languageItemsDataSlice,
    selectLanguageData: selectLanguageDataSlice,
    currencyTableData: currencyTableDataSlice,
    glossaryTableData:glossaryTableDataSlice,
    totalCharacters:TotalCharactersSlice,
    translatingResourceType:translatingResourceTypeSlice,
  },
});

export default store;
export type RootState = ReturnType<typeof store.getState>;
