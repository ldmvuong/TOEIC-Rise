import axios from "axios";
import { Mutex } from "async-mutex";
import { store } from "../redux/store";
import { setRefreshTokenAction } from "../redux/slices/accountSlide";

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

const PUBLIC_ENDPOINTS = [
  "/auth/login",
  "/auth/refresh-token",
  "/auth/verify",
  "/auth/forgot-password",
  "/auth/verify-otp",
  "/auth/reset-password",
  "/test-sets", 
  "/tests" 
];

// Helper check URL
const isPublicUrl = (url) => {
  return PUBLIC_ENDPOINTS.some((endpoint) => url.startsWith(endpoint));
};

// Mutex để tránh multiple refresh token calls
const mutex = new Mutex();
const NO_RETRY_HEADER = "x-no-retry";

// Tạo instance tối giản
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,          // nếu BE set cookie; giữ true vẫn an toàn
  timeout: 150000,                 // tránh treo request quá lâu
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json; charset=utf-8",
  },
});

// --- Refresh Token Handler
const handleRefreshToken = async () => {
  return await mutex.runExclusive(async () => {
    try {
      const res = await api.get("/auth/refresh-token");
      if (res && res.data) {
        return res.data.accessToken;
      }
      return null;
    } catch (error) {
      return null;
    }
  });
};

// --- Helpers 
export const setAccessToken = (token) => {
  if (token) {
    localStorage.setItem("access_token", token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};
export const clearAccessToken = () => {
  localStorage.removeItem("access_token");
  delete api.defaults.headers.common['Authorization'];
};

// --- Interceptors ---
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  const url = config?.url || '';

  if (isPublicUrl(url)) {
    // Nếu Authorization header đã được set trong config.headers (như OTP token cho reset-password), giữ nguyên
    // Chỉ xóa nếu nó đến từ defaults.headers.common (access token)
    const hasCustomAuth = config.headers && config.headers.Authorization && 
                         config.headers.Authorization.startsWith('Bearer ');
    if (!hasCustomAuth && config.headers && config.headers.Authorization) {
      // Xóa Authorization từ defaults nếu không phải là custom auth
      delete config.headers.Authorization;
    }
    return config;
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // Ensure no stale Authorization header leaks into requests
    if (config.headers && config.headers.Authorization) {
      delete config.headers.Authorization;
    }
  }
  return config;
});

// Response interceptor với auto refresh token
api.interceptors.response.use(
  (res) => {
    // Trả về object với status và data để có thể check cả hai
    return {
      status: res.status,
      data: res.data,
      headers: res.headers
    };
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (
      error.response &&
      (error.response.status === 401 ) &&
      !isPublicUrl(originalRequest.url) &&
      originalRequest.url !== "/auth/refresh-token" &&
      !originalRequest.headers[NO_RETRY_HEADER]
    ) {
      originalRequest.headers[NO_RETRY_HEADER] = "true";
      
      const access_token = await handleRefreshToken();
      if (access_token) {
        originalRequest.headers["Authorization"] = `Bearer ${access_token}`;
        localStorage.setItem("access_token", access_token);
        return api.request(originalRequest);
      }
    }
    
    // Handle refresh token failure
    if (
      error.response &&
      error.response.status === 401 &&
      originalRequest.url === "/auth/refresh-token"
    ) {
      const message = error?.response?.data?.message ?? "Có lỗi xảy ra, vui lòng login lại.";
      store.dispatch(setRefreshTokenAction({ status: true, message }));
    }
    
    // Handle 403 Forbidden
    if (error.response && error.response.status === 403) {
      const message = error?.response?.data?.message ?? "Không có quyền truy cập";
      // Silent error handling
    }
    
    // Chuẩn hoá lỗi để FE hiển thị đúng thông điệp
    const hasResponse = !!error?.response;
    if (hasResponse) {
      const payload = error.response.data || {};
      const normalized = {
        statusCode: payload.code || error.response.status,
        status: payload.status || error.code,
        message: payload.message || 'Đã xảy ra lỗi, vui lòng thử lại',
        path: payload.path,
      };
      return Promise.reject(normalized);
    }
    
    // Lỗi mạng / timeout
    return Promise.reject({
      statusCode: 0,
      status: 'NETWORK_ERROR',
      message: 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng.',
    });
  }
);

export default api;
