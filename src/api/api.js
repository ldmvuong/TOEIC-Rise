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






