import React, { useState, useRef, useEffect } from 'react';

const OTPInput = ({ onComplete, onError }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpIndex, setOtpIndex] = useState(0);
  const inputRefs = useRef([]);

  // Auto-focus to current input
  useEffect(() => {
    if (inputRefs.current[otpIndex]) {
      inputRefs.current[otpIndex].focus();
    }
  }, [otpIndex]);

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return; // Prevent multiple characters
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto-focus to next input
    if (value && index < 5) {
      setOtpIndex(index + 1);
    }

    // Check if all fields are filled
    const filledOtp = newOtp.filter(digit => digit !== '');
    if (filledOtp.length === 6) {
      onComplete(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      setOtpIndex(index - 1);
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      setOtpIndex(5);
      onComplete(pastedData);
    }
  };

  const resetOtp = () => {
    setOtp(['', '', '', '', '', '']);
    setOtpIndex(0);
  };

  return (
    <div className="flex justify-center space-x-2">
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={el => inputRefs.current[index] = el}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength="1"
          value={digit}
          onChange={(e) => handleOtpChange(index, e.target.value)}
          onKeyDown={(e) => handleOtpKeyDown(index, e)}
          onPaste={handleOtpPaste}
          className="w-12 h-12 text-center text-lg font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      ))}
    </div>
  );
};

export default OTPInput;
