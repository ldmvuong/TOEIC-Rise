import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getAllWritingTestSets } from '../../api/api';

export const fetchWritingTestSets = createAsyncThunk(
  'writingTestSets/fetchWritingTestSets',
  async ({ query }) => {
    const response = await getAllWritingTestSets(query);
    return response;
  }
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

export const writingTestSetSlide = createSlice({
  name: 'writingTestSets',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchWritingTestSets.pending, (state) => {
      state.isFetching = true;
    });

    builder.addCase(fetchWritingTestSets.rejected, (state) => {
      state.isFetching = false;
    });

    builder.addCase(fetchWritingTestSets.fulfilled, (state, action) => {
      if (action.payload && action.payload.data) {
        state.isFetching = false;
        state.meta = action.payload.data.meta;
        state.result = action.payload.data.result;
      }
    });
  },
});

export default writingTestSetSlide.reducer;
