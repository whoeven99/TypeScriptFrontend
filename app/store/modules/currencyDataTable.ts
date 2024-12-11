import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CurrencyDataType } from "~/routes/app.currency/route";

interface CurrencyTableDataState {
  rows: CurrencyDataType[];
}

const initialState: CurrencyTableDataState = {
  rows: [],
};

const currencyTableDataSlice = createSlice({
  name: "currencyTableData",
  initialState,
  reducers: {
    setTableData: (state, action: PayloadAction<CurrencyDataType[]>) => {
      state.rows = action.payload;
    },
    updateTableData: (state, action: PayloadAction<CurrencyDataType[]>) => {
      action.payload.forEach((newData) => {
        // 检查新数据是否已经存在于 state.rows 中
        const index = state.rows.findIndex(
          (row) => row.currencyCode === newData.currencyCode,
        );

        if (index !== -1) {
          // 如果已存在，更新该行的数据
          state.rows[index] = newData;
        } else {
          // 将包含 key 的 newData 添加到 rows
          state.rows.push(newData);
        }
      });
    },
  },
});

export const { setTableData, updateTableData } =
  currencyTableDataSlice.actions;

const reducer = currencyTableDataSlice.reducer;
export default reducer;
