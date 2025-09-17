import React, { useState, useEffect } from 'react';
import { notification } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import LoginTab from '../../components/auth/LoginTab'
import RegisterTab from '../../components/auth/RegisterTab';
import ForgotPasswordTab from '../../components/auth/ForgotPasswordTab';
import OTPVerificationTab from '../../components/auth/OTPVerificationTab';
import { login as loginApi } from '../../api/api';
import { setAccessToken } from '../../api/axios-customize';

const AuthPage = () => {
  const [currentForm, setCurrentForm] = useState('login');
  const [registerEmail, setRegisterEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  // Clear error when switching tabs/forms
  useEffect(() => {
    setErrorMessage('');
  }, [currentForm]);

  // Handle form submissions
  const handleLogin = async (formData) => {
    try {
      setErrorMessage('');
      setSubmitting(true);

      const response = await loginApi({
        email: formData.email,
        password: formData.password,
      });

      const payload = response?.data;
      if (!payload) {
        throw new Error('Không nhận được dữ liệu phản hồi');
      }

      // Lưu token và thông tin user
      setAccessToken(payload.accessToken);
      if (payload.refreshToken) localStorage.setItem('refresh_token', payload.refreshToken);
      localStorage.setItem('user_info', JSON.stringify({
        userId: payload.userId,
        email: payload.email,
        fullName: payload.fullName,
        role: payload.role,
        expirationTime: payload.expirationTime,
      }));

      // Điều hướng theo role
      const role = String(payload.role || '').toUpperCase();
      if (role === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      // Ưu tiên thông điệp từ BE nếu có
      const serverMessage = err?.message;
      const fallback = err?.status || 'Đăng nhập thất bại';
      const msg = serverMessage || fallback;
      setErrorMessage('');
      notification.error({
        message: 'Đăng nhập thất bại',
        description: msg,
        placement: 'topRight',
        duration: 3,
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
    // TODO: Xử lý khi verify OTP thành công
    console.log('OTP verification successful for email:', registerEmail);
    // Có thể chuyển về trang login hoặc dashboard
    setCurrentForm('login');
    setRegisterEmail('');
  };

  const handleBackToRegister = () => {
    setCurrentForm('register');
    setRegisterEmail('');
  };

  const handleRequestOtp = (email) => {
    console.log('Request OTP:', email);
    // Call onRequestOtp callback here
  };

  const handleVerifyOtp = (data) => {
    console.log('Verify OTP and reset password:', data);
    // Call onVerifyOtp callback here
  };

  const handleGoogleLogin = () => {
    console.log('Google login');
    // Call onGoogle callback here
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
              {errorMessage && (
                <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                  {errorMessage}
                </div>
              )}
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