import React, { useState, useEffect, useMemo } from 'react';
import { notification } from 'antd';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import LoginTab from '../../components/auth/LoginTab'
import RegisterTab from '../../components/auth/RegisterTab';
import ForgotPasswordTab from '../../components/auth/ForgotPasswordTab';
import OTPVerificationTab from '../../components/auth/OTPVerificationTab';
import { login as loginApi, loginWithGoogle } from '../../api/api';
import { setAccessToken } from '../../api/axios-customize';
import { setUserLoginInfo, clearError, fetchAccount } from '../../redux/slices/accountSlide';

const AuthPage = () => {
  const [currentForm, setCurrentForm] = useState('login');
  const [registerEmail, setRegisterEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Redux state
  const isAuthenticated = useAppSelector(state => state.account.isAuthenticated);
  const user = useAppSelector(state => state.account.user);
  const error = useAppSelector(state => state.account.error);

  // URL parameters
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const callbackQueryParam = params.get("callback");

  useEffect(() => {
    if (callbackQueryParam) {
      sessionStorage.setItem('loginCallback', decodeURIComponent(callbackQueryParam));
    }
  }, [callbackQueryParam]); // Chỉ chạy khi query param thay đổi

  useEffect(() => {
    if (isAuthenticated) {
      const savedCallback = sessionStorage.getItem('loginCallback');

      if (savedCallback) {
        sessionStorage.removeItem('loginCallback');
      }

      const redirectPath = savedCallback || (user.role === 'ADMIN' ? '/admin' : '/');

      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, user.role, navigate]); // Bỏ 'callback' ra khỏi đây

  // Clear error when switching tabs/forms
  useEffect(() => {
    dispatch(clearError());
  }, [currentForm, dispatch]);

  // Handle form submissions
  const handleLogin = async (formData) => {
    try {
      dispatch(clearError());
      setSubmitting(true);

      const response = await loginApi({
        email: formData.email,
        password: formData.password,
      });

      const payload = response?.data;
      if (!payload) {
        throw new Error('Không nhận được dữ liệu phản hồi');
      }

      localStorage.setItem('access_token', payload.accessToken);
      setAccessToken(payload.accessToken);

      dispatch(setUserLoginInfo(payload));
      // Fire-and-forget profile fetch; redirect does not depend on it
      try {
        dispatch(fetchAccount());
      } catch { }

      // Redirect immediately here to avoid race with effects
      const savedCallback = sessionStorage.getItem('loginCallback');
      if (savedCallback) {
        sessionStorage.removeItem('loginCallback');
      }
      const userRole = payload?.user?.role || payload?.role || 'USER';
      const redirectPath = savedCallback || (userRole === 'ADMIN' ? '/admin' : '/');
      navigate(redirectPath, { replace: true });
    } catch (err) {
      const serverMessage = err?.response?.data?.message || err?.message;
      const fallback = 'Đăng nhập thất bại';
      const msg = serverMessage || fallback;

      notification.error({
        message: 'Đăng nhập thất bại',
        description: msg,
        placement: 'topRight',
        duration: 5,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSuccess = (email) => {
    setRegisterEmail(email);
    setCurrentForm('otp-verification');
  };

  const handleOTPVerificationSuccess = () => {
    setCurrentForm('login');
    setRegisterEmail('');
  };

  const handleBackToRegister = () => {
    setCurrentForm('register');
    setRegisterEmail('');
  };

  const handleRequestOtp = (email) => {
    console.log('Request OTP:', email);
    // TODO: Implement OTP request API
  };

  const handleVerifyOtp = (data) => {
    console.log('Verify OTP and reset password:', data);
    // TODO: Implement OTP verification API
  };

  const handleGoogleLogin = () => {
    loginWithGoogle();
  };

  const getFormTitle = () => {
    switch (currentForm) {
      case 'login':
        return 'Đăng nhập';
      case 'register':
        return 'Tạo tài khoản';
      case 'otp-verification':
        return 'Xác thực email';
      case 'forgot':
        return 'Quên mật khẩu';
      default:
        return 'Đăng nhập';
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Back to Home Button */}
      <Link
        to="/"
        className="absolute top-4 left-4 z-10 flex items-center text-gray-600 hover:text-gray-800 transition-colors"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Quay lại trang chủ
      </Link>

      {/* Left Column - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-50 to-blue-50 p-12 flex-col justify-center">
        <div className="max-w-md">
          {/* Logo */}
          <div className="flex items-center mb-8">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mr-4">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-green-600 rounded-full"></div>
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">TOEIC RISE</h1>
              <p className="text-gray-600">Online Testing System</p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start">
              <div className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p className="text-gray-700">Bộ đề ETS 2018–2024, giao diện sát thực tế</p>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p className="text-gray-700">Theo dõi tiến độ, phân tích điểm mạnh/yếu</p>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p className="text-gray-700">ChatAI hỗ trợ giải thích câu khó</p>
            </div>
          </div>

          {/* Tip Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-blue-800 text-sm">
              💡 <strong>Mẹo:</strong> Bạn có thể đăng nhập bằng Google để bắt đầu nhanh chóng!
            </p>
          </div>
        </div>
      </div>

      {/* Right Column - Authentication Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-blue-600 text-white px-8 py-4">
              <div className="text-center">
                <h2 className="text-xl font-semibold">{getFormTitle()}</h2>
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="transition-all duration-300 ease-in-out">
                {currentForm === 'login' && (
                  <div className="animate-fadeIn">
                    <LoginTab
                      onLogin={handleLogin}
                      onGoogleLogin={handleGoogleLogin}
                      onSwitchToRegister={() => setCurrentForm('register')}
                      onSwitchToForgot={() => setCurrentForm('forgot')}
                    />
                  </div>
                )}

                {currentForm === 'register' && (
                  <div className="animate-fadeIn">
                    <RegisterTab
                      onRegisterSuccess={handleRegisterSuccess}
                      onSwitchToLogin={() => setCurrentForm('login')}
                      onGoogleLogin={handleGoogleLogin}
                    />
                  </div>
                )}

                {currentForm === 'otp-verification' && (
                  <div className="animate-fadeIn">
                    <OTPVerificationTab
                      email={registerEmail}
                      onVerifySuccess={handleOTPVerificationSuccess}
                      onBackToRegister={handleBackToRegister}
                    />
                  </div>
                )}

                {currentForm === 'forgot' && (
                  <div className="animate-fadeIn">
                    <ForgotPasswordTab
                      onRequestOtp={handleRequestOtp}
                      onVerifyOtp={handleVerifyOtp}
                      onSwitchToLogin={() => setCurrentForm('login')}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-t border-gray-200">
              <div className="text-center text-sm text-gray-600">
                {currentForm === 'login' && (
                  <p>
                    Chưa có tài khoản?{' '}
                    <button
                      onClick={() => setCurrentForm('register')}
                      className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200 hover:underline"
                    >
                      Tạo tài khoản ngay
                    </button>
                  </p>
                )}
                {currentForm === 'register' && (
                  <p>
                    Đã có tài khoản?{' '}
                    <button
                      onClick={() => setCurrentForm('login')}
                      className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200 hover:underline"
                    >
                      Đăng nhập ngay
                    </button>
                  </p>
                )}
                {currentForm === 'forgot' && (
                  <p>
                    Nhớ mật khẩu?{' '}
                    <button
                      onClick={() => setCurrentForm('login')}
                      className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200 hover:underline"
                    >
                      Đăng nhập ngay
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;