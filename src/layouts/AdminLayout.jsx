import React, { useEffect, useState, useMemo } from "react";
import {
    AppstoreOutlined,
    ExceptionOutlined,
    ApiOutlined,
    UserOutlined,
    BankOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    AliwangwangOutlined,
    ScheduleOutlined,
    BugOutlined,
    LogoutOutlined,
    SettingOutlined,
    HomeOutlined,
    FileTextOutlined,
    BarChartOutlined,
} from "@ant-design/icons";
import { Layout, Menu, Dropdown, Space, Avatar, Button, message } from "antd";
import { Outlet, useLocation, Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { setLogoutAction } from "../redux/slices/accountSlide";
import { logout as logoutApi } from "../api/api";

const { Content, Sider } = Layout;

const STATIC_MENU = [
    { label: <Link to="/admin">Dashboard</Link>, key: "/admin", icon: <AppstoreOutlined />, roles: ["ADMIN", "STAFF"] },
    { label: <Link to="/admin/analytics">Analytics</Link>, key: "/admin/analytics", icon: <BarChartOutlined />, roles: ["ADMIN", "STAFF"] },
    { label: <Link to="/admin/test-sets">Test Sets</Link>, key: "/admin/test-sets", icon: <BankOutlined />, roles: ["ADMIN"] },
    { label: <Link to="/admin/tests">Tests</Link>, key: "/admin/tests", icon: <BugOutlined />, roles: ["ADMIN", "STAFF"] },
    { label: <Link to="/admin/users">User</Link>, key: "/admin/users", icon: <UserOutlined />, roles: ["ADMIN"] },
    { label: <Link to="/admin/reports">Reports</Link>, key: "/admin/reports", icon: <FileTextOutlined />, roles: ["ADMIN", "STAFF"] },
];

export default function AdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [collapsed, setCollapsed] = useState(false);
    const [activeMenu, setActiveMenu] = useState("/admin");``
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    
    // Redux state
    const isAuthenticated = useAppSelector(state => state.account.isAuthenticated);
    const user = useAppSelector(state => state.account.user);

    useEffect(() => {
        const path = location.pathname.startsWith("/admin") ? location.pathname : "/admin";
        setActiveMenu(path);
    }, [location.pathname]);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logoutApi();
            message.success('Đăng xuất thành công!');
        } catch (error) {
            message.warning('Có lỗi khi đăng xuất, nhưng đã đăng xuất local');
        } finally {
            dispatch(setLogoutAction());
            navigate('/');
            setIsLoggingOut(false);
        }
    };

    const handleMenuClick = ({ key }) => {
        switch (key) {
            case 'profile':
                navigate('/admin/profile');
                break;
            case 'home':
                navigate('/');
                break;
            case 'logout':
                handleLogout();
                break;
            default:
                break;
        }
    };

    const itemsDropdown = [
        { 
            label: "Profile", 
            key: "profile",
            icon: <UserOutlined />
        },
        { 
            label: "User Page", 
            key: "home",
            icon: <HomeOutlined />
        },
        { type: 'divider' },
        { 
            label: "Logout", 
            key: "logout",
            icon: <LogoutOutlined />,
            disabled: isLoggingOut
        },
    ];

    const currentRole = user?.role;

    const filteredMenu = useMemo(() => {
        if (!currentRole) return STATIC_MENU;
        return STATIC_MENU.filter(item => !item.roles || item.roles.includes(currentRole));
    }, [currentRole]);

    return (
        <Layout style={{ minHeight: "120vh" }} className="layout-admin">
            <Sider theme="light" collapsible collapsed={collapsed} onCollapse={(v) => setCollapsed(v)}>
                <div style={{ height: 32, margin: 16, textAlign: "center", fontWeight: 600 }}>
                    <BugOutlined /> ADMIN
                </div>
                <Menu
                    selectedKeys={[activeMenu]}
                    mode="inline"
                    items={filteredMenu}
                    onClick={(e) => setActiveMenu(e.key)}
                />
            </Sider>

            <Layout>
                <div
                    className="admin-header"
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginRight: 20 }}
                >
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed((s) => !s)}
                        style={{ fontSize: 16, width: 64, height: 64 }}
                    />
                    <Dropdown 
                        menu={{ 
                            items: itemsDropdown, 
                            onClick: handleMenuClick 
                        }} 
                        trigger={["click"]}
                    >
                        <Space style={{ cursor: "pointer", paddingRight: 8 }}>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>
                                    {user?.fullName || 'Admin'}
                                </div>
                                <div style={{ fontSize: 12, color: "#666" }}>
                                    {user?.email || 'admin@toeic-rise.com'}
                                </div>
                            </div>
                            <Avatar 
                                src={user?.avatar} 
                                style={{ backgroundColor: '#1890ff' }}
                            >
                                {user?.fullName?.charAt(0)?.toUpperCase() || 'A'}
                            </Avatar>
                        </Space>
                    </Dropdown>
                </div>

                <Content style={{ padding: 15 }}>
                    {/* Nội dung trang con sẽ render ở đây */}
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
}
