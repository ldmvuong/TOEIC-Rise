import React, { useState, useEffect } from 'react';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { notification, message } from 'antd';
import { forgotPassword as forgotPasswordApi, verifyOTP as verifyOtpApi, resetPassword as resetPasswordApi } from '../../api/api';
import { isValidEmail, isStrongPassword } from '../../utils/validation';
import OTPInput from './OTPInput';

const ForgotPasswordTab = ({ onRequestOtp, onVerifyOtp, onSwitchToLogin }) => {
  const [step, setStep] = useState(1); // 1: email input, 2: OTP verification, 3: new password
  const [formData, setFormData] = useState({
    email: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [otpToken, setOtpToken] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData.email) {
        newErrors.email = 'Email là bắt buộc';
      } else if (!isValidEmail(formData.email)) {
        newErrors.email = 'Email không hợp lệ';
      }
    } else if (step === 2) {
      // nothing to validate here, OTP handled by OTPInput component
    } else {
      if (!formData.newPassword) {
        newErrors.newPassword = 'Mật khẩu mới là bắt buộc';
      } else if (!isStrongPassword(formData.newPassword)) {
        newErrors.newPassword = 'Mật khẩu 8-20 ký tự, có chữ thường, chữ hoa, số, ký tự đặc biệt (.@#$%^&+=) và không có khoảng trắng';
      }
      
      if (!formData.confirmNewPassword) {
        newErrors.confirmNewPassword = 'Xác nhận mật khẩu mới là bắt buộc';
      } else if (formData.newPassword !== formData.confirmNewPassword) {
        newErrors.confirmNewPassword = 'Mật khẩu không khớp';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      await forgotPasswordApi({ email: formData.email });
      setStep(2);
      setResendCountdown(60);
      if (onRequestOtp) onRequestOtp(formData.email);
    } catch (err) {
      notification.error({
        message: 'Yêu cầu đổi mật khẩu thất bại',
        description: err?.message || 'Vui lòng thử lại.',
        placement: 'topRight',
        duration: 5,
      });
    }
  };

  const handleVerifyOtp = async (otp) => {
    try {
      const res = await verifyOtpApi({ email: formData.email, otp });
      const token = res?.data; // BE returns token string
      if (!token) throw new Error('Không nhận được token xác thực');
      setOtpToken(token);
      notification.success({
        message: 'Xác thực OTP thành công',
        placement: 'topRight',
        duration: 3,
      });
      setStep(3);
    } catch (err) {
      notification.error({
        message: 'Xác thực OTP thất bại',
        description: err?.message || 'Vui lòng thử lại.',
        placement: 'topRight',
        duration: 5,
      });
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    try {
      await forgotPasswordApi({ email: formData.email });
      notification.success({
        message: 'Đã gửi lại OTP',
        placement: 'topRight',
        duration: 3,
      });
      setResendCountdown(60);
      if (onRequestOtp) onRequestOtp(formData.email);
    } catch (err) {
      notification.error({
        message: 'Gửi lại OTP thất bại',
        description: err?.message || 'Vui lòng thử lại.',
        placement: 'topRight',
        duration: 3,
      });
    }
  };

  const handleBackToEmail = () => {
    setStep(1);
    setErrors({});
    setResendCountdown(0);
    setOtpToken('');
  };

  const handleSubmitNewPassword = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      await resetPasswordApi({ password: formData.newPassword, confirmPassword: formData.confirmNewPassword }, otpToken);
      message.success('Đổi mật khẩu thành công! Đang chuyển về trang đăng nhập...');
      // Clear sensitive state
      setOtpToken('');
      setFormData({ email: '', newPassword: '', confirmNewPassword: '' });
      setErrors({});
      // Chuyển về trang login ngay lập tức
      setTimeout(() => {
        if (onSwitchToLogin) onSwitchToLogin();
      }, 1500);
    } catch (err) {
      notification.error({
        message: 'Đổi mật khẩu thất bại',
        description: err?.message || 'Vui lòng thử lại.',
        placement: 'topRight',
        duration: 5,
      });
    }
  };

  return (
    <form onSubmit={step === 1 ? handleRequestOtp : step === 3 ? handleSubmitNewPassword : (e) => e.preventDefault()} noValidate className="space-y-6">
      {step === 1 ? (
        <>
          <div>
            <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              id="forgot-email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Nhập email của bạn"
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Gửi OTP
          </button>
        </>
      ) : step === 2 ? (
        <>
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600">
              OTP đã gửi tới <strong>{formData.email}</strong>
            </p>
            <button
              type="button"
              onClick={handleBackToEmail}
              className="text-xs text-blue-600 hover:text-blue-700 mt-1"
            >
              Thay đổi email
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Nhập mã OTP (6 số)
            </label>
            <OTPInput onComplete={handleVerifyOtp} />
            <div className="text-center mt-3">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCountdown > 0}
                className={`text-sm ${
                  resendCountdown > 0
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                {resendCountdown > 0 ? `Gửi lại OTP (${resendCountdown}s)` : 'Gửi lại OTP'}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
              Mật khẩu mới
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                id="new-password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Nhập mật khẩu mới"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showNewPassword ? <AiOutlineEyeInvisible className="w-5 h-5" /> : <AiOutlineEye className="w-5 h-5" />}
              </button>
            </div>
            {errors.newPassword && <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>}
          </div>

          <div>
            <label htmlFor="confirm-new-password" className="block text-sm font-medium text-gray-700 mb-2">
              Nhập lại mật khẩu mới
            </label>
            <div className="relative">
              <input
                type={showConfirmNewPassword ? 'text' : 'password'}
                id="confirm-new-password"
                name="confirmNewPassword"
                value={formData.confirmNewPassword}
                onChange={handleInputChange}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Nhập lại mật khẩu mới"
              />
              <button
                type="button"
                onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label={showConfirmNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showConfirmNewPassword ? <AiOutlineEyeInvisible className="w-5 h-5" /> : <AiOutlineEye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmNewPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmNewPassword}</p>}
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Đổi mật khẩu
          </button>
        </>
      )}

    </form>
  );
};

export default ForgotPasswordTab;
