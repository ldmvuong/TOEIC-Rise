import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getAllSpeakingTests } from "../../api/api";

export const fetchSpeakingTests = createAsyncThunk(
  "speakingTests/fetchSpeakingTests",
  async ({ query }) => {
    const response = await getAllSpeakingTests(query);
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

export const speakingTestManagementSlide = createSlice({
  name: "speakingTests",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchSpeakingTests.pending, (state) => {
      state.isFetching = true;
    });
    builder.addCase(fetchSpeakingTests.rejected, (state) => {
      state.isFetching = false;
    });
    builder.addCase(fetchSpeakingTests.fulfilled, (state, action) => {
      if (action.payload && action.payload.data) {
        state.isFetching = false;
        state.meta = action.payload.data.meta;
        state.result = action.payload.data.result;
      }
    });
  },
});

export default speakingTestManagementSlide.reducer;
