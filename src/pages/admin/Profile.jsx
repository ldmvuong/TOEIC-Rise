import React from 'react';
import { Card, Descriptions, Avatar, Typography } from 'antd';
import { UserOutlined, MailOutlined } from '@ant-design/icons';
import { useAppSelector } from '../../redux/hooks';

const { Title } = Typography;

const Profile = () => {
    const user = useAppSelector(state => state.account.user);

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
                    <Avatar 
                        src={user?.avatar} 
                        size={120}
                        style={{ 
                            backgroundColor: '#1890ff',
                            marginBottom: '16px'
                        }}
                    >
                        {user?.fullName?.charAt(0)?.toUpperCase() || 'A'}
                    </Avatar>
                    <Title level={2} style={{ marginTop: '16px', marginBottom: '0' }}>
                        {user?.fullName || 'Administrator'}
                    </Title>
                    <div style={{ 
                        color: '#666', 
                        fontSize: '16px',
                        marginTop: '8px'
                    }}>
                        Thông tin cá nhân
                    </div>
                </div>

                {/* Info Section */}
                <Descriptions 
                    column={1}
                    bordered
                    size="large"
                    labelStyle={{ 
                        fontWeight: 600,
                        width: '200px',
                        backgroundColor: '#fafafa'
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
                        {user?.email || 'admin@toeic-rise.com'}
                    </Descriptions.Item>
                    
                    <Descriptions.Item 
                        label={
                            <span>
                                <UserOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                                Họ và tên
                            </span>
                        }
                    >
                        {user?.fullName || 'Administrator'}
                    </Descriptions.Item>
                    
                    <Descriptions.Item 
                        label={
                            <span>
                                <UserOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                                Giới tính
                            </span>
                        }
                    >
                        {user?.gender || 'Chưa cập nhật'}
                    </Descriptions.Item>
                </Descriptions>

                {/* Note Section */}
                <div style={{ 
                    marginTop: '24px',
                    padding: '16px',
                    background: '#e6f7ff',
                    borderRadius: '4px',
                    border: '1px solid #91d5ff'
                }}>
                    <div style={{ 
                        fontSize: '14px',
                        color: '#0050b3',
                        textAlign: 'center'
                    }}>
                        💡 Tính năng cập nhật thông tin sẽ có sẵn trong phiên bản tiếp theo
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Profile;
