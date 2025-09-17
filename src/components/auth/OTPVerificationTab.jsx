import React, { useState, useEffect } from 'react';
import { message, notification } from 'antd';
import OTPInput from './OTPInput';
import { verifyUser, resendOTP } from '../../api/api';

const OTPVerificationTab = ({ email, onVerifySuccess, onBackToRegister }) => {
  const [timeLeft, setTimeLeft] = useState(5 * 60); // 5 phút = 300 giây
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleOTPComplete = async (otp) => {
    setIsVerifying(true);

    try {
      const response = await verifyUser({
        email: email,
        verificationCode: otp
      });
      
      
      // Kiểm tra status code 200
      if (response && response.status === 200) {
        message.success('Xác thực email thành công! Đang chuyển về trang đăng nhập...');
        // Chuyển về login sau 2 giây
        setTimeout(() => {
          onVerifySuccess();
        }, 2000);
      }
    } catch (error) {
      
      // Hiển thị lỗi bằng notification
      notification.error({
        message: "Xác thực OTP thất bại",
        description: error && typeof error === 'string' ? error : 'OTP không hợp lệ',
        duration: 5
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    setIsResending(true);

    try {
      const response = await resendOTP({
        email: email
      });
      
      console.log('Resend OTP response:', response);
      
      // Kiểm tra status code 200
      if (response && response.status === 200) {
        message.success('Đã gửi lại mã OTP thành công!');
        setTimeLeft(5 * 60); // Reset countdown
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      
      // Hiển thị lỗi bằng notification
      notification.error({
        message: "Gửi lại OTP thất bại",
        description: error && typeof error === 'string' ? error : 'Có lỗi xảy ra, vui lòng thử lại',
        duration: 5
      });
    } finally {
      setIsResending(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Thông báo email */}
      <div className="text-center">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-center mb-2">
            <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-green-800 font-medium">Mã xác nhận đã được gửi</span>
          </div>
          <p className="text-green-700 text-sm">
            Mã xác nhận email đã được gửi vào email <strong>{email}</strong>. 
            Vui lòng nhập OTP để hoàn tất đăng ký tài khoản.
          </p>
        </div>
      </div>

      {/* Nhập OTP */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
          Nhập mã xác nhận (6 chữ số)
        </label>
        <OTPInput 
          onComplete={handleOTPComplete} 
          onError={() => {}}
        />
      </div>

      {/* Countdown timer */}
      <div className="text-center">
        {timeLeft > 0 ? (
          <p className="text-gray-600 text-sm">
            Mã OTP còn hiệu lực trong: <span className="font-semibold text-blue-600">{formatTime(timeLeft)}</span>
          </p>
        ) : (
          <p className="text-red-600 text-sm font-medium">
            Mã OTP đã hết hạn
          </p>
        )}
      </div>

      {/* Resend button */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleResendOTP}
          disabled={isResending || timeLeft > 0}
          className={`text-sm transition-colors ${
            isResending || timeLeft > 0
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-blue-600 hover:text-blue-700 hover:underline'
          }`}
        >
          {isResending ? 'Đang gửi lại...' : 'Gửi lại mã OTP'}
        </button>
      </div>

      {/* Loading overlay khi đang verify */}
      {isVerifying && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-700">Đang xác thực...</span>
          </div>
        </div>
      )}

      {/* Back button */}
      <div className="text-center pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onBackToRegister}
          className="text-sm text-gray-600 hover:text-gray-800 hover:underline transition-colors"
        >
          ← Quay lại đăng ký
        </button>
      </div>
    </div>
  );
};

export default OTPVerificationTab;
