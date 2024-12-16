import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { GLossaryDataType } from "~/routes/app.glossary/route";

interface glossaryTableDataState {
  rows: GLossaryDataType[];
}

const initialState: glossaryTableDataState = {
  rows: [],
};

const glossaryTableDataSlice = createSlice({
  name: "glossaryTableData",
  initialState,
  reducers: {
    setGLossaryTableData: (state, action: PayloadAction<any[]>) => {
      state.rows = action.payload;
    },
    updateGLossaryTableData: (state, action: PayloadAction<any>) => {
      // 检查新数据是否已经存在于 state.rows 中
      const index = state.rows.findIndex(
        (row) => row.key === action.payload.key,
      );
      if (index !== -1) {
        // 如果已存在，更新该行的数据
        state.rows[index] = action.payload;
      } else {
        state.rows.push(action.payload);
      }
    },
    deleteGLossaryTableData: (state, action: PayloadAction<number[]>) => {
      // 检查新数据是否已经存在于 state.rows 中
      state.rows.filter((row) => !action.payload.includes(row.key));
    },
    setGLossaryStatusLoadingState: (
      state,
      action: PayloadAction<{
        key?: number;
        loading: boolean;
        status?: number;
      }>,
    ) => {
      if (action.payload.key) {
        const row = state.rows.find((item) => item.key === action.payload.key);
        if (row) {
          row.loading = action.payload.loading;
          if (action.payload.status !== undefined) {
            row.status = action.payload.status;
          }
        }
      } else {
        state.rows.map((row) => ({
          ...row,
          loading: action.payload.loading,
        }));
      }
    },
    setGLossaryStatusState: (
      state,
      action: PayloadAction<{ key: number; status: number }>,
    ) => {
      const row = state.rows.find((item) => item.key === action.payload.key);
      if (row) {
        row.status = action.payload.status;
      }
    },
  },
});

export const {
  setGLossaryTableData,
  updateGLossaryTableData,
  setGLossaryStatusLoadingState,
  setGLossaryStatusState,
} = glossaryTableDataSlice.actions;

const reducer = glossaryTableDataSlice.reducer;
export default reducer;
