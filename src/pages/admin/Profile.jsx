import React, { useState, useRef, useEffect } from 'react';
import { Card, Descriptions, Avatar, Typography, Button, Input, Select, message, Spin, Modal } from 'antd';
import { UserOutlined, MailOutlined, EditOutlined, CameraOutlined, SaveOutlined, CloseOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons';
import { getUserProfile, updateUserProfile, changeUserPassword } from '../../api/api';
import { useAppDispatch } from '../../redux/hooks';
import { fetchAccount } from '../../redux/slices/accountSlide';
import { isStrongPassword, isValidFullName, validateAvatar } from '../../utils/validation';

const { Title } = Typography;
const { Option } = Select;

const Profile = () => {
    const dispatch = useAppDispatch();
    const [profileData, setProfileData] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [formData, setFormData] = useState({
        fullName: '',
        gender: '',
        avatar: null
    });
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [avatarFile, setAvatarFile] = useState(null);
    const fileInputRef = useRef(null);
    const [formErrors, setFormErrors] = useState({});

    // Password change modal state
    const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordErrors, setPasswordErrors] = useState({});
    const [passwordLoading, setPasswordLoading] = useState(false);

    // Fetch profile data on mount
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
                message.error(error?.message || 'Unable to load profile information');
            } finally {
                setFetchLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const getGenderDisplay = (gender) => {
        if (!gender) return 'Not updated';
        const genderMap = {
            'MALE': 'Male',
            'FEMALE': 'Female',
            'OTHER': 'Other'
        };
        return genderMap[gender] || gender;
    };

    const handleEdit = () => {
        setIsEditing(true);
        setFormData({
            fullName: profileData?.fullName || '',
            gender: profileData?.gender || '',
            avatar: null
        });
        setAvatarPreview(profileData?.avatar || null);
        setAvatarFile(null);
        setFormErrors({});
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
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        // Clear error when user starts typing
        if (formErrors[field]) {
            setFormErrors(prev => ({
                ...prev,
                [field]: ''
            }));
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
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
            };
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
        const errors = {};
        
        // Validate fullName
        if (!formData.fullName || !formData.fullName.trim()) {
            errors.fullName = 'Full name cannot be empty';
        } else if (!isValidFullName(formData.fullName.trim())) {
            errors.fullName = 'Full name can only contain letters and spaces';
        }
        
        // Validate gender
        if (!formData.gender) {
            errors.gender = 'Please select gender';
        }
        
        // Validate avatar if file is selected
        if (avatarFile) {
            const validation = validateAvatar(avatarFile);
            if (!validation.valid) {
                errors.avatar = validation.errors[0];
            }
        }
        
        // Set errors and return if there are any
        setFormErrors(errors);
        if (Object.keys(errors).length > 0) {
            return;
        }

        setLoading(true);
        try {
            const data = new FormData();
            data.append('fullName', formData.fullName);
            data.append('gender', formData.gender);
            
            if (avatarFile) {
                data.append('avatar', avatarFile);
            }

            const response = await updateUserProfile(data);
            if (response && response.status === 200) {
                message.success('Profile updated successfully');
                setIsEditing(false);
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
                // Refresh Redux store
                await dispatch(fetchAccount());
            }
        } catch (error) {
            message.error(error?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    // Password change handlers
    const handleOpenPasswordModal = () => {
        setIsPasswordModalVisible(true);
        setPasswordData({
            oldPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
        setPasswordErrors({});
    };

    const handleClosePasswordModal = () => {
        setIsPasswordModalVisible(false);
        setPasswordData({
            oldPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
        setPasswordErrors({});
    };

    const handlePasswordInputChange = (field, value) => {
        setPasswordData(prev => ({
            ...prev,
            [field]: value
        }));
        // Clear error when user starts typing
        if (passwordErrors[field]) {
            setPasswordErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const validatePasswordForm = () => {
        const errors = {};
        
        if (!passwordData.oldPassword) {
            errors.oldPassword = 'Please enter old password';
        }
        
        if (!passwordData.newPassword) {
            errors.newPassword = 'Please enter new password';
        } else if (!isStrongPassword(passwordData.newPassword)) {
            errors.newPassword = 'Password must be 8-20 characters, include lowercase, uppercase, number, special characters (.@#$%^&+=) and no spaces';
        }
        
        if (!passwordData.confirmPassword) {
            errors.confirmPassword = 'Please confirm password';
        } else if (passwordData.newPassword !== passwordData.confirmPassword) {
            errors.confirmPassword = 'Password confirmation does not match';
        }
        
        setPasswordErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleChangePassword = async () => {
        if (!validatePasswordForm()) {
            return;
        }

        setPasswordLoading(true);
        try {
            const response = await changeUserPassword(passwordData);
            if (response && response.status === 200) {
                message.success('Password changed successfully');
                handleClosePasswordModal();
            }
        } catch (error) {
            message.error(error?.message || 'Failed to change password');
        } finally {
            setPasswordLoading(false);
        }
    };

    if (fetchLoading) {
        return (
            <div style={{ padding: '24px', minHeight: '100vh', background: '#f0f2f5', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div style={{ padding: '24px', minHeight: '100vh', background: '#f0f2f5' }}>
            <Card 
                style={{ 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    borderRadius: '8px'
                }}
            >
                {/* Header Section */}
                <div style={{ 
                    textAlign: 'center', 
                    marginBottom: '32px',
                    paddingBottom: '24px',
                    borderBottom: '1px solid #f0f0f0'
                }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <Avatar 
                            src={avatarPreview} 
                            size={120}
                            style={{ 
                                backgroundColor: '#1890ff',
                                marginBottom: '16px'
                            }}
                        >
                            {formData.fullName?.charAt(0)?.toUpperCase() || profileData?.fullName?.charAt(0)?.toUpperCase() || 'A'}
                        </Avatar>
                        {isEditing && (
                            <>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={handleAvatarChange}
                                />
                                <div style={{
                                    position: 'absolute',
                                    bottom: '0',
                                    right: '0',
                                    display: 'flex',
                                    gap: '8px'
                                }}>
                                    {avatarFile && (
                                        <Button
                                            type="primary"
                                            danger
                                            shape="circle"
                                            icon={<DeleteOutlined />}
                                            style={{
                                                zIndex: 2,
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                            }}
                                            onClick={handleRemoveAvatar}
                                            disabled={loading}
                                        />
                                    )}
                                    <Button
                                        type="primary"
                                        shape="circle"
                                        icon={<CameraOutlined />}
                                        style={{
                                            zIndex: 2,
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                        }}
                                        onClick={() => fileInputRef.current?.click()}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    {isEditing && formErrors.avatar && (
                        <div style={{ 
                            color: 'red', 
                            fontSize: '12px', 
                            marginTop: '8px'
                        }}>
                            {formErrors.avatar}
                        </div>
                    )}
                    <Title level={2} style={{ marginTop: '16px', marginBottom: '0' }}>
                        {formData.fullName || profileData?.fullName || 'Administrator'}
                    </Title>
                    <div style={{ 
                        color: '#666', 
                        fontSize: '16px',
                        marginTop: '8px'
                    }}>
                        Personal Information
                    </div>
                </div>

                {/* Info Section */}
                <Descriptions 
                    column={1}
                    bordered
                    size="large"
                    styles={{
                        label: {
                            fontWeight: 600,
                            width: '200px',
                            backgroundColor: '#fafafa'
                        }
                    }}
                >
                    <Descriptions.Item 
                        label={
                            <span>
                                <MailOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                                Email
                            </span>
                        }
                    >
                        {profileData?.email || 'admin@toeic-rise.com'}
                    </Descriptions.Item>
                    
                    {isEditing ? (
                        <Descriptions.Item 
                            label={
                                <span>
                                    <UserOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                                    Full Name
                                </span>
                            }
                        >
                            <div>
                                <Input
                                    value={formData.fullName}
                                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                                    placeholder="Enter full name"
                                    status={formErrors.fullName ? 'error' : ''}
                                />
                                {formErrors.fullName && (
                                    <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                                        {formErrors.fullName}
                                    </div>
                                )}
                            </div>
                        </Descriptions.Item>
                    ) : (
                        <Descriptions.Item 
                            label={
                                <span>
                                    <UserOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                                    Full Name
                                </span>
                            }
                        >
                            {profileData?.fullName || 'Administrator'}
                        </Descriptions.Item>
                    )}
                    
                    {isEditing ? (
                        <Descriptions.Item 
                            label={
                                <span>
                                    <UserOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                                    Gender
                                </span>
                            }
                        >
                            <div>
                                <Select
                                    style={{ width: '100%' }}
                                    value={formData.gender}
                                    onChange={(value) => handleInputChange('gender', value)}
                                    placeholder="Select gender"
                                    status={formErrors.gender ? 'error' : ''}
                                >
                                    <Option value="MALE">Male</Option>
                                    <Option value="FEMALE">Female</Option>
                                    <Option value="OTHER">Other</Option>
                                </Select>
                                {formErrors.gender && (
                                    <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                                        {formErrors.gender}
                                    </div>
                                )}
                            </div>
                        </Descriptions.Item>
                    ) : (
                        <Descriptions.Item 
                            label={
                                <span>
                                    <UserOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                                    Gender
                                </span>
                            }
                        >
                            {getGenderDisplay(profileData?.gender)}
                        </Descriptions.Item>
                    )}
                </Descriptions>

                {/* Action Buttons */}
                <div style={{ 
                    marginTop: '24px',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '12px',
                    flexWrap: 'wrap'
                }}>
                    {isEditing ? (
                        <>
                            <Button
                                type="default"
                                icon={<CloseOutlined />}
                                onClick={handleCancel}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                onClick={handleSave}
                                loading={loading}
                            >
                                Save Changes
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                type="primary"
                                icon={<EditOutlined />}
                                onClick={handleEdit}
                            >
                                Edit Profile
                            </Button>
                            <Button
                                icon={<LockOutlined />}
                                onClick={handleOpenPasswordModal}
                            >
                                Change Password
                            </Button>
                        </>
                    )}
                </div>

            </Card>

            {/* Password Change Modal */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <LockOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
                        <span>Change Password</span>
                    </div>
                }
                open={isPasswordModalVisible}
                onCancel={handleClosePasswordModal}
                onOk={handleChangePassword}
                okText="Change Password"
                cancelText="Cancel"
                confirmLoading={passwordLoading}
                width={500}
            >
                <div style={{ padding: '16px 0' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                            Old Password <span style={{ color: 'red' }}>*</span>
                        </label>
                        <Input.Password
                            size="large"
                            placeholder="Enter old password"
                            value={passwordData.oldPassword}
                            onChange={(e) => handlePasswordInputChange('oldPassword', e.target.value)}
                        />
                        {passwordErrors.oldPassword && (
                            <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                                {passwordErrors.oldPassword}
                            </div>
                        )}
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                            New Password <span style={{ color: 'red' }}>*</span>
                        </label>
                        <Input.Password
                            size="large"
                            placeholder="Enter new password"
                            value={passwordData.newPassword}
                            onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
                        />
                        {passwordErrors.newPassword && (
                            <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                                {passwordErrors.newPassword}
                            </div>
                        )}
                        <div style={{ 
                            fontSize: '12px', 
                            color: '#666', 
                            marginTop: '4px' 
                        }}>
                            Password must be 8-20 characters, include lowercase, uppercase, number, special characters (.@#$%^&+=) and no spaces
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                            Confirm Password <span style={{ color: 'red' }}>*</span>
                        </label>
                        <Input.Password
                            size="large"
                            placeholder="Re-enter new password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)}
                        />
                        {passwordErrors.confirmPassword && (
                            <div style={{ color: 'red', fontSize: '12px', marginTop: '4px' }}>
                                {passwordErrors.confirmPassword}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Profile;
