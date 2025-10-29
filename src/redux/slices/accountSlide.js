import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getProfile } from '../../api/api';
import { clearAccessToken } from '../../api/axios-customize';

// Thunk để fetch account
export const fetchAccount = createAsyncThunk(
  'account/fetchAccount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getProfile();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch profile');
    }
  }
);

// Initial state
const initialState = {
  isAuthenticated: false,
  isLoading: true,
  isRefreshToken: false,
  errorRefreshToken: '',
  error: null,
  user: {
    id: null,
    fullName: '',
    avatar: null,
    email: '',
    gender: null,
    role: '',
    hasPassword: false,
  },
  activeMenu: 'home',
};

export const accountSlide = createSlice({
  name: 'account',
  initialState,
  reducers: {
    setActiveMenu: (state, action) => {
      state.activeMenu = action.payload;
    },
    setUserLoginInfo: (state, action) => {
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
      
      const userData = action.payload;
      state.user.id = userData?.userId || userData?.id || null;
      state.user.fullName = userData?.fullName || '';
      state.user.avatar = userData?.avatar || null;
      state.user.email = userData?.email || '';
      state.user.gender = userData?.gender || null;
      state.user.role = userData?.role || '';
      state.user.hasPassword = userData?.hasPassword || true;
    },
    setLogoutAction: (state) => {
      localStorage.removeItem('access_token');
      // Also clear axios default Authorization header to avoid leaking stale tokens
      clearAccessToken();
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      state.user = {
        id: null,
        fullName: '',
        avatar: null,
        email: '',
        gender: null,
        role: '',
        hasPassword: false,
      };
    },
    setRefreshTokenAction: (state, action) => {
      state.isRefreshToken = action.payload?.status ?? false;
      state.errorRefreshToken = action.payload?.message ?? '';
    },
    clearError: (state) => {
      state.error = null;
      state.errorRefreshToken = '';
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAccount.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        
        if (action.payload) {
          state.isAuthenticated = true;
          state.user.id = action.payload.id || null;
          state.user.fullName = action.payload.fullName || '';
          state.user.avatar = action.payload.avatar || null;
          state.user.email = action.payload.email || '';
          state.user.gender = action.payload.gender || null;
          state.user.role = action.payload.role || '';
          state.user.hasPassword = action.payload.hasPassword || false;
        }
      })
      .addCase(fetchAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.error = action.payload || 'Failed to fetch user profile';
        
        // Reset user data on error
        state.user = {
          id: null,
          fullName: '',
          avatar: null,
          email: '',
          gender: null,
          role: '',
          hasPassword: false,
        };
      });
  },
});

export const {
  setActiveMenu,
  setUserLoginInfo,
  setLogoutAction,
  setRefreshTokenAction,
  clearError,
  setLoading,
} = accountSlide.actions;

export default accountSlide.reducer;
