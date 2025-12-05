import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notification } from 'antd';
import { useAppDispatch } from '../../redux/hooks';
import { setUserLoginInfo, fetchAccount } from '../../redux/slices/accountSlide';
import { setAccessToken } from '../../api/axios-customize';
import { sanitizeCallback } from '../../utils/callback';

const GoogleCallbackHandler = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('google_success');
    const error = urlParams.get('google_error');
    const token = urlParams.get('access_token');
    const userData = urlParams.get('user_data');

    if (success === 'true' && token && userData) {
      try {
        const user = JSON.parse(decodeURIComponent(userData));
        
        // Set token vào localStorage và axios headers
        setAccessToken(token);
        
        // Dispatch user info to Redux (thông tin cơ bản từ callback)
        dispatch(setUserLoginInfo(user));
        
        // Fetch thông tin đầy đủ từ API (bao gồm avatar và các thông tin khác)
        // Fire-and-forget: không cần đợi kết quả, redirect ngay
        try {
          dispatch(fetchAccount());
        } catch (err) {
          // Ignore error, user info đã được set từ callback
          console.warn('Failed to fetch account details:', err);
        }
        
        const saved = sessionStorage.getItem('loginCallback');
        if (saved) sessionStorage.removeItem('loginCallback');
        const redirectPath = sanitizeCallback(saved) || (user.role === 'ADMIN' ? '/admin' : '/');
        navigate(redirectPath, { replace: true });
      } catch (err) {
        notification.error({
          message: 'Lỗi xử lý dữ liệu Google',
          description: 'Vui lòng thử lại',
          placement: 'topRight',
          duration: 5,
        });
        navigate('/auth', { replace: true });
      }
    } else if (error) {
      notification.error({
        message: 'Đăng nhập Google thất bại',
        description: error,
        placement: 'topRight',
        duration: 5,
      });
      navigate('/auth', { replace: true });
    } else {
      // No callback parameters, check if we have token and userData anyway
      if (token && userData) {
        try {
          const user = JSON.parse(decodeURIComponent(userData));
          
          // Set token vào localStorage và axios headers
          setAccessToken(token);
          
          // Dispatch user info to Redux (thông tin cơ bản từ callback)
          dispatch(setUserLoginInfo(user));
          
          // Fetch thông tin đầy đủ từ API (bao gồm avatar và các thông tin khác)
          // Fire-and-forget: không cần đợi kết quả, redirect ngay
          try {
            dispatch(fetchAccount());
          } catch (err) {
            // Ignore error, user info đã được set từ callback
            console.warn('Failed to fetch account details:', err);
          }
          
          const saved = sessionStorage.getItem('loginCallback');
          if (saved) sessionStorage.removeItem('loginCallback');
          const redirectPath = sanitizeCallback(saved) || (user.role === 'ADMIN' ? '/admin' : '/');
          navigate(redirectPath, { replace: true });
        } catch (err) {
          notification.error({
            message: 'Lỗi xử lý dữ liệu Google',
            description: 'Vui lòng thử lại',
            placement: 'topRight',
            duration: 5,
          });
          navigate('/auth', { replace: true });
        }
      } else {
        // No callback parameters, redirect to auth page
        navigate('/auth', { replace: true });
      }
    }
  }, [navigate, dispatch]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Đang xử lý đăng nhập Google...</p>
      </div>
    </div>
  );
};

export default GoogleCallbackHandler;
