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
    // updateGLossaryTableData: (state, action: PayloadAction<GLossaryDataType>) => {
    //   action.payload.forEach((newData) => {
    //     // 检查新数据是否已经存在于 state.rows 中
    //     const index = state.rows.findIndex(
    //       (row) => row.locale === newData.locale,
    //     );
    //     if (index !== -1) {
    //       // 如果已存在，更新该行的数据
    //       state.rows[index] = newData;
    //     } else {
    //       // 如果不存在，新增数据
    //       const dataWithKey = {
    //         ...newData,
    //         key: state.rows.slice(-1)[0]?.key + 1 || 0,
    //       };
    //       // 将包含 key 的 newData 添加到 rows
    //       state.rows.push(dataWithKey);
    //     }
    //   });
    // },
    setGLossaryStatusLoadingState: (
        state,
        action: PayloadAction<{ id: string; loading: boolean }>,
      ) => {
        const row = state.rows.find(
          (item) => item.id === action.payload.id,
        );
        if (row) {
          row.loading = action.payload.loading;
        }
      },
    setGLossaryStatusState: (
      state,
      action: PayloadAction<{ id: string; status: number }>,
    ) => {
      const row = state.rows.find(
        (item) => item.id === action.payload.id,
      );
      if (row) {
        row.status = action.payload.status;
      }
    },
  },
});

export const {
  setGLossaryTableData,
//   updateGLossaryTableData,
setGLossaryStatusLoadingState,
  setGLossaryStatusState,
} = glossaryTableDataSlice.actions;

const reducer = glossaryTableDataSlice.reducer;
export default reducer;
