import axios from "axios";

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

// Tạo instance tối giản
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,          // nếu BE set cookie; giữ true vẫn an toàn
  timeout: 15000,                 // tránh treo request quá lâu
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json; charset=utf-8",
  },
});

// --- Helpers 
export const setAccessToken = (token) => {
  if (token) localStorage.setItem("access_token", token);
};
export const clearAccessToken = () => {
  localStorage.removeItem("access_token");
};

// --- Interceptors ---
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Trả về response object đầy đủ để có thể check status và data
api.interceptors.response.use(
  (res) => {
    // Trả về object với status và data để có thể check cả hai
    return {
      status: res.status,
      data: res.data,
      headers: res.headers
    };
  },
  (error) => {
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
