import React, { useState, useRef, useEffect } from 'react';
import { message } from 'antd';
import { getUserProfile, updateUserProfile, changeUserPassword } from '../../api/api';
import { useAppDispatch } from '../../redux/hooks';
import { fetchAccount } from '../../redux/slices/accountSlide';
import { isStrongPassword, isValidFullName, validateAvatar } from '../../utils/validation';

const Profile = () => {
    const dispatch = useAppDispatch();
    
    // Profile state
    const [profileData, setProfileData] = useState(null);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('info'); // 'info' or 'password'
    const [loading, setLoading] = useState(false);
    
    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        gender: '',
        avatar: null
    });
    const [formErrors, setFormErrors] = useState({});
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [avatarFile, setAvatarFile] = useState(null);
    const fileInputRef = useRef(null);

    // Password state
    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordErrors, setPasswordErrors] = useState({});
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [showPassword, setShowPassword] = useState({
        oldPassword: false,
        newPassword: false,
        confirmPassword: false
    });

    // Fetch profile on mount
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setFetchLoading(true);
                const response = await getUserProfile();
                if (response && response.status === 200) {
                    setProfileData(response.data);
                    setFormData({
                        fullName: response.data?.fullName || '',
                        gender: response.data?.gender || '',
                        avatar: null
                    });
                    setAvatarPreview(response.data?.avatar || null);
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setFetchLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const getGenderDisplay = (gender) => {
        if (!gender) return 'Chưa cập nhật';
        const genderMap = {
            'MALE': 'Nam',
            'FEMALE': 'Nữ',
            'OTHER': 'Khác'
        };
        return genderMap[gender] || gender;
    };

    // Edit handlers
    const handleEdit = () => {
        setIsEditing(true);
        setFormData({
            fullName: profileData?.fullName || '',
            gender: profileData?.gender || '',
            avatar: null
        });
        setAvatarPreview(profileData?.avatar || null);
        setAvatarFile(null);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setFormData({
            fullName: profileData?.fullName || '',
            gender: profileData?.gender || '',
            avatar: null
        });
        setAvatarPreview(profileData?.avatar || null);
        setAvatarFile(null);
        setFormErrors({});
        // Clear file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (formErrors[field]) {
            setFormErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate avatar file
            const validation = validateAvatar(file);
            
            if (!validation.valid) {
                // Clear file input
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                // Display first error message
                setFormErrors(prev => ({
                    ...prev,
                    avatar: validation.errors[0]
                }));
                return;
            }
            
            // Clear any previous errors
            setFormErrors(prev => ({
                ...prev,
                avatar: ''
            }));
            
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setAvatarPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveAvatar = () => {
        setAvatarFile(null);
        setAvatarPreview(profileData?.avatar || null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        // Clear avatar error
        setFormErrors(prev => ({
            ...prev,
            avatar: ''
        }));
    };

    const handleSave = async () => {
        // Validate form
        const errors = {};
        
        // Validate fullName
        if (!formData.fullName || !formData.fullName.trim()) {
            errors.fullName = 'Họ và tên không được để trống';
        } else if (!isValidFullName(formData.fullName.trim())) {
            errors.fullName = 'Họ và tên chỉ được chứa chữ cái và khoảng trắng';
        }
        
        // Validate gender
        if (!formData.gender) {
            errors.gender = 'Vui lòng chọn giới tính';
        }
        
        // Validate avatar if file is selected
        if (avatarFile) {
            const validation = validateAvatar(avatarFile);
            if (!validation.valid) {
                errors.avatar = validation.errors[0];
            }
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setLoading(true);
        try {
            const data = new FormData();
            data.append('fullName', formData.fullName);
            
            // Only append gender if it has a value
            if (formData.gender) {
                data.append('gender', formData.gender);
            }
            
            if (avatarFile) {
                data.append('avatar', avatarFile);
            }

            const response = await updateUserProfile(data);
            if (response && response.status === 200) {
                message.success('Cập nhật thông tin thành công');
                setIsEditing(false);
                setFormErrors({}); // Clear errors
                
                // Use update response to refresh local state (avoid extra GET)
                const updated = response.data;
                if (updated) {
                    setProfileData(updated);
                    setFormData({
                        fullName: updated?.fullName || '',
                        gender: updated?.gender || '',
                        avatar: null
                    });
                    setAvatarPreview(updated?.avatar || null);
                }
                
                // Refresh Redux
                await dispatch(fetchAccount());
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            message.error(error?.message || 'Cập nhật thông tin thất bại');
        } finally {
            setLoading(false);
        }
    };

    // Password handlers
    const handlePasswordInputChange = (field, value) => {
        setPasswordData(prev => ({ ...prev, [field]: value }));
        if (passwordErrors[field]) {
            setPasswordErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const togglePasswordVisibility = (field) => {
        setShowPassword(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const validatePasswordForm = () => {
        const errors = {};
        
        if (!passwordData.oldPassword) errors.oldPassword = 'Vui lòng nhập mật khẩu cũ';
        if (!passwordData.newPassword) errors.newPassword = 'Vui lòng nhập mật khẩu mới';
        else if (!isStrongPassword(passwordData.newPassword)) {
            errors.newPassword = 'Mật khẩu 8-20 ký tự, có chữ thường, chữ hoa, số, ký tự đặc biệt (.@#$%^&+=) và không có khoảng trắng';
        }
        if (!passwordData.confirmPassword) errors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
        else if (passwordData.newPassword !== passwordData.confirmPassword) errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
        
        setPasswordErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleChangePassword = async () => {
        if (!validatePasswordForm()) return;

        setPasswordLoading(true);
        try {
            const response = await changeUserPassword(passwordData);
            if (response && response.status === 200) {
                message.success('Đổi mật khẩu thành công');
                setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                setPasswordErrors({});
            }
        } catch (error) {
            console.error('Error changing password:', error);
            message.error(error?.message || 'Đổi mật khẩu thất bại');
        } finally {
            setPasswordLoading(false);
        }
    };

    if (fetchLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const tabs = [
        { id: 'info', name: 'Thông tin cá nhân', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        )},
        { id: 'password', name: 'Đổi mật khẩu', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a6 6 0 00-12 0v4h12z" />
            </svg>
        )},
    ];

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Tài khoản của tôi</h1>
                    <p className="text-gray-600">Quản lý thông tin cá nhân và bảo mật tài khoản</p>
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {/* Tab Navigation */}
                    <div className="border-b border-gray-200">
                        <div className="flex">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                                        activeTab === tab.id
                                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                                >
                                    {tab.icon}
                                    {tab.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="p-8">
                        {/* Info Tab */}
                        {activeTab === 'info' && (
                            <div className="space-y-6">
                                {/* Avatar Section */}
                                <div className="flex items-center gap-8">
                                    <div className="relative">
                                        {avatarPreview ? (
                                            <img
                                                src={avatarPreview}
                                                alt="Avatar"
                                                className="w-32 h-32 rounded-full border-4 border-gray-200 object-cover"
                                            />
                                        ) : (
                                            <div className="w-32 h-32 rounded-full border-4 border-gray-200 bg-blue-600 flex items-center justify-center text-white text-4xl font-bold">
                                                {(formData.fullName || profileData?.fullName || 'U').charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        {isEditing && (
                                            <div className="absolute bottom-0 right-0 flex gap-2">
                                                {avatarFile && (
                                                    <button
                                                        onClick={handleRemoveAvatar}
                                                        className="bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition"
                                                        disabled={loading}
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleAvatarChange}
                                                />
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg transition"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-800">
                                            {formData.fullName || profileData?.fullName || 'Người dùng'}
                                        </h2>
                                        <p className="text-gray-600">{profileData?.email || ''}</p>
                                    </div>
                                </div>
                                
                                {/* Avatar Error Message */}
                                {isEditing && formErrors.avatar && (
                                    <div className="text-red-500 text-sm mt-2">
                                        {formErrors.avatar}
                                    </div>
                                )}

                                {/* Info Fields */}
                                <div className="space-y-6">
                                    {/* Full Name and Gender in one row */}
                                    {isEditing && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Full Name */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Họ và tên <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.fullName}
                                                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                                                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                                                        formErrors.fullName ? 'border-red-500' : 'border-gray-300'
                                                    }`}
                                                    placeholder="Nhập họ và tên"
                                                />
                                                {formErrors.fullName && (
                                                    <p className="text-red-500 text-sm mt-1">{formErrors.fullName}</p>
                                                )}
                                            </div>

                                            {/* Gender */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Giới tính <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    value={formData.gender}
                                                    onChange={(e) => handleInputChange('gender', e.target.value)}
                                                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                                                        formErrors.gender ? 'border-red-500' : 'border-gray-300'
                                                    }`}
                                                >
                                                    <option value="">Chọn giới tính</option>
                                                    <option value="MALE">Nam</option>
                                                    <option value="FEMALE">Nữ</option>
                                                    <option value="OTHER">Khác</option>
                                                </select>
                                                {formErrors.gender && (
                                                    <p className="text-red-500 text-sm mt-1">{formErrors.gender}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Display mode - Full Name and Gender in one row */}
                                    {!isEditing && (
                                        <>
                                            {/* Full Name and Gender in one row */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Full Name */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Họ và tên
                                                    </label>
                                                    <p className="px-4 py-3 bg-gray-50 rounded-lg text-gray-800">{profileData?.fullName || 'Chưa cập nhật'}</p>
                                                </div>

                                                {/* Gender */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Giới tính
                                                    </label>
                                                    <p className="px-4 py-3 bg-gray-50 rounded-lg text-gray-800">{getGenderDisplay(profileData?.gender)}</p>
                                                </div>
                                            </div>

                                            {/* Email (Read-only) */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Email
                                                </label>
                                                <p className="px-4 py-3 bg-gray-50 rounded-lg text-gray-800">{profileData?.email || ''}</p>
                                            </div>
                                        </>
                                    )}

                                    {/* Email field in edit mode */}
                                    {isEditing && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Email
                                            </label>
                                            <p className="px-4 py-3 bg-gray-50 rounded-lg text-gray-800">{profileData?.email || ''}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-end gap-3 pt-4 border-t">
                                    {isEditing ? (
                                        <>
                                            <button
                                                onClick={handleCancel}
                                                disabled={loading}
                                                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                                            >
                                                Hủy
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                disabled={loading}
                                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {loading && (
                                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                )}
                                                Lưu thay đổi
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={handleEdit}
                                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                            Chỉnh sửa thông tin
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Password Tab */}
                        {activeTab === 'password' && (
                            <div className="max-w-2xl space-y-6">

                                <div className="space-y-5">
                                    {/* Old Password */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Mật khẩu hiện tại <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword.oldPassword ? 'text' : 'password'}
                                                value={passwordData.oldPassword}
                                                onChange={(e) => handlePasswordInputChange('oldPassword', e.target.value)}
                                                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                                placeholder="Nhập mật khẩu hiện tại"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => togglePasswordVisibility('oldPassword')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                                            >
                                                {showPassword.oldPassword ? (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                        {passwordErrors.oldPassword && (
                                            <p className="text-red-500 text-sm mt-1">{passwordErrors.oldPassword}</p>
                                        )}
                                    </div>

                                    {/* New Password */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Mật khẩu mới <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword.newPassword ? 'text' : 'password'}
                                                value={passwordData.newPassword}
                                                onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
                                                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                                placeholder="Nhập mật khẩu mới"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => togglePasswordVisibility('newPassword')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                                            >
                                                {showPassword.newPassword ? (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                        {passwordErrors.newPassword && (
                                            <p className="text-red-500 text-sm mt-1">{passwordErrors.newPassword}</p>
                                        )}
                                        <p className="text-gray-500 text-xs mt-2">Mật khẩu 8-20 ký tự, có chữ thường, chữ hoa, số, ký tự đặc biệt (.@#$%^&+=)</p>
                                    </div>

                                    {/* Confirm Password */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword.confirmPassword ? 'text' : 'password'}
                                                value={passwordData.confirmPassword}
                                                onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)}
                                                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                                placeholder="Nhập lại mật khẩu mới"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => togglePasswordVisibility('confirmPassword')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                                            >
                                                {showPassword.confirmPassword ? (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                        {passwordErrors.confirmPassword && (
                                            <p className="text-red-500 text-sm mt-1">{passwordErrors.confirmPassword}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Action Button */}
                                <div className="flex justify-end pt-4">
                                    <button
                                        onClick={handleChangePassword}
                                        disabled={passwordLoading}
                                        className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {passwordLoading && (
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        )}
                                        Đổi mật khẩu
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
