import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getAllTests } from '../../api/api';

export const fetchTests = createAsyncThunk(
  'tests/fetchTests',
  async ({ query }) => {
    const response = await getAllTests(query);
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

export const testSlide = createSlice({
  name: 'tests',
  initialState,
  reducers: {
    setActiveMenu: (state, action) => {
      // Nếu sau này bạn định dùng menu, có thể thêm logic ở đây
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchTests.pending, (state) => {
      state.isFetching = true;
    });

    builder.addCase(fetchTests.rejected, (state) => {
      state.isFetching = false;
    });

    builder.addCase(fetchTests.fulfilled, (state, action) => {
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
} = testSlide.actions;

export default testSlide.reducer;
