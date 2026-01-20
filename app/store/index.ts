import languageTableDataSlice from "./modules/languageTableData";
import languageItemsDataSlice from "./modules/languageItemsData";
import currencyTableDataSlice from "./modules/currencyDataTable";
import glossaryTableDataSlice from "./modules/glossaryTableData"
import TotalCharactersSlice from "./modules/totalCharacters";
import userConfigSlice from "./modules/userConfig";
import translatingResourceTypeSlice from "./modules/translatingResourceType";
import { configureStore } from "@reduxjs/toolkit";

const store = configureStore({
  reducer: {
    languageTableData: languageTableDataSlice,
    languageItemsData: languageItemsDataSlice,
    currencyTableData: currencyTableDataSlice,
    glossaryTableData: glossaryTableDataSlice,
    totalCharacters: TotalCharactersSlice,
    translatingResourceType: translatingResourceTypeSlice,
    userConfig: userConfigSlice,
  },
});

export default store;
export type RootState = ReturnType<typeof store.getState>;
