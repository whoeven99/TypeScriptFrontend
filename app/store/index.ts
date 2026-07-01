import languageTableDataSlice from "./modules/languageTableData";
import languageItemsDataSlice from "./modules/languageItemsData";
import currencyTableDataSlice from "./modules/currencyDataTable";
import glossaryTableDataSlice from "./modules/glossaryTableData";
import userConfigSlice from "./modules/userConfig";
import { configureStore } from "@reduxjs/toolkit";

const store = configureStore({
  reducer: {
    languageTableData: languageTableDataSlice,
    languageItemsData: languageItemsDataSlice,
    currencyTableData: currencyTableDataSlice,
    glossaryTableData: glossaryTableDataSlice,
    userConfig: userConfigSlice,
  },
});

export default store;
export type RootState = ReturnType<typeof store.getState>;
