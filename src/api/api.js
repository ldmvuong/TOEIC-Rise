import api  from './axios-customize'

// Auth

export const register = (payload) => api.post("/auth/register", payload);
export const verifyUser = (payload) => api.post("/auth/verify", payload);
export const resendOTP = (payload) => api.post("/auth/resend", payload);
export const login = (payload) => api.post("/auth/login", payload);
export const forgotPassword = (payload) => api.post("/auth/forgot-password", payload);
export const verifyOTP = (payload) => api.post("/auth/verify-otp", payload);
// Reset password requires OTP token in Authorization header
export const resetPassword = (payload, token) => api.post(
  "/auth/reset-password",
  payload,
  token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
);

export const getProfile = () => api.get("/auth/me");

export const logout = () => api.get("/auth/logout");

// Google OAuth
export const loginWithGoogle = () => {
  // Redirect to backend Google OAuth endpoint with callback URL
  const callbackUrl = encodeURIComponent(`${window.location.origin}/auth/google/callback`);
  window.location.href = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8080"}/auth/login/google?callback=${callbackUrl}`;
};

export const refreshToken = () => api.post("/auth/refresh-token");

// Test Sets

export const createTestSet = (payload) => api.post("/admin/test-sets/create", payload);
export const updateTestSet = (payload) => api.put("/admin/test-sets/update", payload);

export const getAllTestSets = (query) => {
    return api.get(`/admin/test-sets?${query}`);
};

export const getTestInTestSet = (id, query) => api.get(`/admin/test-sets/${id}?${query}`);

// Tests
export const getAllTests = (query) => api.get(`/admin/tests?${query}`);

export const importTests = (formData) =>
  api.post('/admin/tests/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });


export const getTestById = (id) => api.get(`/admin/tests/${id}`);

export const updateTest = (id, payload) => api.put(`/admin/tests/${id}`, payload);







