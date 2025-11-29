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

// Admin Test Sets

export const createTestSet = (payload) => api.post("/admin/test-sets", payload);
export const updateTestSet = (payload) => api.put("/admin/test-sets", payload);

export const getAllTestSets = (query) => {
    return api.get(`/admin/test-sets?${query}`);
};

export const getTestInTestSet = (id, query) => api.get(`/admin/test-sets/${id}?${query}`);

// Admin/Staff Tests
export const getAllTests = (query) => api.get(`/staff/tests?${query}`);

export const importTests = (formData) =>
  api.post('/staff/tests/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

export const getTestById = (id) => api.get(`/staff/tests/${id}`);

export const updateTest = (id, payload) => api.put(`/staff/tests/${id}`, payload);

//PATCH : ADMIN


// Profile

export const getUserProfile = () => api.get("/profile");

export const updateUserProfile = (formData) => {
  return api.put("/profile", formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const changeUserPassword = (payload) => api.put("/change-password", payload);


// guest access to some tests
export const getPublicTestSets = () => {
    return api.get("/test-sets");
};

export const getPublicTest = (query) => {
    return api.get(`/tests?${query}`);
};

export const getPublicTestById = (id) => {
    return api.get(`/tests/${id}`);
};



// Admin users

export const getAllUsers = (query) => api.get(`/admin/users?${query}`);

export const createUser = (formData) => api.post("/admin/users", formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

export const getUserById = (id) => api.get(`/admin/users/${id}`);

export const updateUser = (id, formData) =>
  api.put(`/admin/users/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const resetUserPassword = (id, payload) =>
  api.put(`/admin/users/${id}/reset-password`, payload);

export const changeUserStatus = (id) =>
  api.patch(`/admin/users/${id}`);




// Learner

export const getTestExam = (id, parts) => {
  const partsArray = Array.isArray(parts) ? parts : [parts];
  return api.get(`/learner/user-tests/exam/${id}`, {
    params: { 
      parts: partsArray.join(',') // Format: ?parts=1,2,3
    }
  });
};

export const getUserTestHistory = (testId) =>
  api.get(`/learner/user-tests/view-histories/${testId}`);

export const submitTestExam = (payload) => api.post('/learner/user-tests', payload);

export const getUserTestStatisticsResult = (userTestId) =>
  api.get(`/learner/user-tests/${userTestId}`);

export const getUserTestAnswersOverall = (userTestId) =>
  api.get(`/learner/user-tests/answers-overall/${userTestId}`);

export const viewAnswersQuestionDetail = (userAnswerId) =>
  api.get(`/learner/user-answers/${userAnswerId}`);


export const viewTestResultDetails = (userTestId) =>
  api.get(`/learner/user-tests/detail/${userTestId}`);

export const reportQuestionIssue = (payload) =>
  api.post('/learner/question-reports', payload);

export const getHistoryTest = (query) => api.get(`/learner/analysis/result?${query}`);

export const getTestAnalytics = (query) => api.get(`/learner/analysis?${query}`);

export const getScoreStatistics = (size = 5) =>
  api.get(`/learner/analysis/full-test?size=${size}`);