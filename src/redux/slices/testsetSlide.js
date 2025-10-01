import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getAllTestSets } from '../../api/api';

export const fetchTestSets = createAsyncThunk(
  'testSets/fetchTestSets',
  async ({ query }) => {
    const response = await getAllTestSets(query);
    return response;
  }
);


// Initial state
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

export const testSetSlide = createSlice({
  name: 'testSets',
  initialState,
  reducers: {
    setActiveMenu: (state, action) => {
      // Nếu sau này bạn định dùng menu, có thể thêm logic ở đây
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchTestSets.pending, (state) => {
      state.isFetching = true;
    });

    builder.addCase(fetchTestSets.rejected, (state) => {
      state.isFetching = false;
    });

    builder.addCase(fetchTestSets.fulfilled, (state, action) => {
      if (action.payload && action.payload.data) {
        state.isFetching = false;
        state.meta = action.payload.data.meta;
        state.result = action.payload.data.result;
      }
    });
  },
});

export const {
  setActiveMenu,
} = testSetSlide.actions;

export default testSetSlide.reducer;
