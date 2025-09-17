import React, { useEffect, useState } from "react";
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
} from "@ant-design/icons";
import { Layout, Menu, Dropdown, Space, Avatar, Button } from "antd";
import { Outlet, useLocation, Link } from "react-router-dom";

const { Content, Sider } = Layout;

const STATIC_MENU = [
    { label: <Link to="/admin">Dashboard</Link>, key: "/admin", icon: <AppstoreOutlined /> },
    { label: <Link to="/admin/company">TOEIC Exams</Link>, key: "/admin/company", icon: <BankOutlined /> },
    { label: <Link to="/admin/company">Report</Link>, key: "/admin/company", icon: <BankOutlined /> },
    { label: <Link to="/admin/user">User</Link>, key: "/admin/user", icon: <UserOutlined /> },
    { label: <Link to="/admin/job">Test Result Statistics</Link>, key: "/admin/job", icon: <ScheduleOutlined /> },
    { label: <Link to="/admin/resume">Leaner Statistics</Link>, key: "/admin/resume", icon: <AliwangwangOutlined /> },
    { label: <Link to="/admin/permission">Chatbot Rating</Link>, key: "/admin/permission", icon: <ApiOutlined /> },
    { label: <Link to="/admin/role">Chatbot System</Link>, key: "/admin/role", icon: <ExceptionOutlined /> },
];

export default function AdminLayout() {
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [activeMenu, setActiveMenu] = useState("/admin");

    useEffect(() => {
        // Đồng bộ menu đang chọn theo URL
        // Nếu vào /admin thì set "/admin"; các trang con set đúng key tương ứng
        const path = location.pathname.startsWith("/admin") ? location.pathname : "/admin";
        setActiveMenu(path);
    }, [location.pathname]);

    const itemsDropdown = [
        { label: <Link to="/">Trang chủ</Link>, key: "home" },
        { label: <span style={{ cursor: "not-allowed", opacity: 0.6 }}>Đăng xuất (demo)</span>, key: "logout" },
    ];

    return (
        <Layout style={{ minHeight: "120vh" }} className="layout-admin">
            <Sider theme="light" collapsible collapsed={collapsed} onCollapse={(v) => setCollapsed(v)}>
                <div style={{ height: 32, margin: 16, textAlign: "center", fontWeight: 600 }}>
                    <BugOutlined /> ADMIN
                </div>
                <Menu
                    selectedKeys={[activeMenu]}
                    mode="inline"
                    items={STATIC_MENU}
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
                    <Dropdown menu={{ items: itemsDropdown }} trigger={["click"]}>
                        <Space style={{ cursor: "pointer", paddingRight: 8 }}>
                            Welcome Admin
                            <Avatar>AD</Avatar>
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
