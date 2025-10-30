import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getAllUsers } from '../../api/api';

export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async ({ query }) => {
    const response = await getAllUsers(query);
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

export const userSlide = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchUsers.pending, (state) => {
      state.isFetching = true;
    });
    builder.addCase(fetchUsers.rejected, (state) => {
      state.isFetching = false;
    });
    builder.addCase(fetchUsers.fulfilled, (state, action) => {
      if (action.payload && action.payload.data) {
        state.isFetching = false;
        state.meta = action.payload.data.meta;
        state.result = action.payload.data.result;
      }
    });
  },
});

export default userSlide.reducer;
