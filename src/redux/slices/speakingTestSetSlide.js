import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getAllSpeakingTestSets } from '../../api/api';

export const fetchSpeakingTestSets = createAsyncThunk(
  'speakingTestSets/fetchSpeakingTestSets',
  async ({ query }) => {
    const response = await getAllSpeakingTestSets(query);
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

export const speakingTestSetSlide = createSlice({
  name: 'speakingTestSets',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchSpeakingTestSets.pending, (state) => {
      state.isFetching = true;
    });

    builder.addCase(fetchSpeakingTestSets.rejected, (state) => {
      state.isFetching = false;
    });

    builder.addCase(fetchSpeakingTestSets.fulfilled, (state, action) => {
      if (action.payload && action.payload.data) {
        state.isFetching = false;
        state.meta = action.payload.data.meta;
        state.result = action.payload.data.result;
      }
    });
  },
});

export default speakingTestSetSlide.reducer;
