import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getAllWritingTests } from "../../api/api";

export const fetchWritingTests = createAsyncThunk(
  "writingTests/fetchWritingTests",
  async ({ query }) => {
    const response = await getAllWritingTests(query);
    return response;
  },
);

const initialState = {
  isFetching: true,
  meta: {
    page: 0,
    pageSize: 10,
    pages: 0,
    total: 0,
  },
  result: [],
};

export const writingTestManagementSlide = createSlice({
  name: "writingTests",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchWritingTests.pending, (state) => {
      state.isFetching = true;
    });
    builder.addCase(fetchWritingTests.rejected, (state) => {
      state.isFetching = false;
    });
    builder.addCase(fetchWritingTests.fulfilled, (state, action) => {
      if (action.payload && action.payload.data) {
        state.isFetching = false;
        state.meta = action.payload.data.meta;
        state.result = action.payload.data.result;
      }
    });
  },
});

export default writingTestManagementSlide.reducer;
