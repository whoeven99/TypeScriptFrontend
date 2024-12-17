import languageTableDataSlice from "./modules/languageTableData";
import languageItemsDataSlice from "./modules/languageItemsData"
import selectLanguageDataSlice from "./modules/selectLanguageData"
import glossaryTableDataSlice from "./modules/glossaryTableData"
import TotalCharactersSlice from "./modules/totalCharacters"
import { configureStore } from "@reduxjs/toolkit";

const store = configureStore({
  reducer: {
    languageTableData: languageTableDataSlice,
    languageItemsData: languageItemsDataSlice,
    selectLanguageData: selectLanguageDataSlice,
    glossaryTableData:glossaryTableDataSlice,
    totalCharacters:TotalCharactersSlice,
  },
});

export default store;
export type RootState = ReturnType<typeof store.getState>;
