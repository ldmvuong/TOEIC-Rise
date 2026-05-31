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
  TagOutlined,
  BookOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  FormOutlined,
} from "@ant-design/icons";
import { Layout, Menu, Dropdown, Space, Avatar, Button, message } from "antd";
import { Outlet, useLocation, Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { setLogoutAction } from "../redux/slices/accountSlide";
import { logout as logoutApi } from "../api/api";

const { Content, Sider } = Layout;

/** Submenu key (not a route) — keep in sync with Menu `openKeys` below */
const TEST_SETS_SUBMENU_KEY = "admin-test-sets-submenu";

const TEST_SET_ROUTES = [
    "/admin/test-sets",
    "/admin/speaking-test-sets",
    "/admin/writing-test-sets",
];

/** Submenu for system prompts — open for list + detail URLs under this prefix */
const PROMPTS_SUBMENU_KEY = "admin-system-prompts-submenu";
const PROMPT_ROUTE_PREFIX = "/admin/system-prompts";

const TESTS_SUBMENU_KEY = "admin-tests-submenu";

const STATIC_MENU = [
  {
    label: <Link to="/admin">Dashboard</Link>,
    key: "/admin",
    icon: <AppstoreOutlined />,
    roles: ["ADMIN", "STAFF"],
  },
  {
    label: <Link to="/admin/analytics">Analytics</Link>,
    key: "/admin/analytics",
    icon: <BarChartOutlined />,
    roles: ["ADMIN", "STAFF"],
  },
  {
    key: TEST_SETS_SUBMENU_KEY,
    label: "Test sets",
    icon: <BankOutlined />,
    roles: ["ADMIN"],
    children: [
      {
        key: "/admin/test-sets",
        label: <Link to="/admin/test-sets">Test Sets</Link>,
        icon: <BankOutlined />,
      },
      {
        key: "/admin/speaking-test-sets",
        label: <Link to="/admin/speaking-test-sets">Speaking Test Sets</Link>,
        icon: <AudioOutlined />,
      },
      {
        key: "/admin/writing-test-sets",
        label: <Link to="/admin/writing-test-sets">Writing Test Sets</Link>,
        icon: <FormOutlined />,
      },
    ],
  },
  {
    key: TESTS_SUBMENU_KEY,
    label: "Tests",
    icon: <BugOutlined />,
    roles: ["ADMIN", "STAFF"],
    children: [
      {
        key: "/admin/tests",
        label: <Link to="/admin/tests">Listening & reading</Link>,
        icon: <BugOutlined />,
      },
      {
        key: "/admin/speaking-tests",
        label: <Link to="/admin/speaking-tests">Speaking</Link>,
        icon: <AudioOutlined />,
      },
      {
        key: "/admin/writing-tests",
        label: <Link to="/admin/writing-tests">Writing</Link>,
        icon: <FormOutlined />,
      },
    ],
  },
  {
    label: <Link to="/admin/users">User</Link>,
    key: "/admin/users",
    icon: <UserOutlined />,
    roles: ["ADMIN"],
  },
  {
    label: <Link to="/admin/reports">Reports</Link>,
    key: "/admin/reports",
    icon: <FileTextOutlined />,
    roles: ["ADMIN", "STAFF"],
  },
  {
    label: <Link to="/admin/tags">Tags</Link>,
    key: "/admin/tags",
    icon: <TagOutlined />,
    roles: ["ADMIN", "STAFF"],
  },
  {
    label: <Link to="/admin/dictation">Dictation</Link>,
    key: "/admin/dictation",
    icon: <ScheduleOutlined />,
    roles: ["ADMIN", "STAFF"],
  },
  {
    label: <Link to="/admin/learning-paths">Learning Path</Link>,
    key: "/admin/learning-paths",
    icon: <VideoCameraOutlined />,
    roles: ["ADMIN", "STAFF"],
  },
  {
    label: <Link to="/admin/blog-categories">Blog categories</Link>,
    key: "/admin/blog-categories",
    icon: <BookOutlined />,
    roles: ["ADMIN", "STAFF"],
  },
  {
    key: PROMPTS_SUBMENU_KEY,
    label: "Prompts",
    icon: <ApiOutlined />,
    roles: ["ADMIN"],
    children: [
      {
        key: "/admin/system-prompts/chatbot",
        label: <Link to="/admin/system-prompts/chatbot">Chatbot Prompts</Link>,
        icon: <ApiOutlined />,
      },
      {
        key: "/admin/system-prompts/q-and-a",
        label: <Link to="/admin/system-prompts/q-and-a">Q & A Prompts</Link>,
        icon: <ApiOutlined />,
      },
      {
        key: "/admin/system-prompts/explanation",
        label: (
          <Link to="/admin/system-prompts/explanation">
            Explanation Prompts
          </Link>
        ),
        icon: <ApiOutlined />,
      },
      {
        key: "/admin/system-prompts/sentence-assessment",
        label: (
          <Link to="/admin/system-prompts/sentence-assessment">
            Sentence Assessment Prompts
          </Link>
        ),
        icon: <ApiOutlined />,
      },
      {
        key: "/admin/system-prompts/writing-assessment",
        label: (
          <Link to="/admin/system-prompts/writing-assessment">
            Writing Assessment Prompts
          </Link>
        ),
        icon: <ApiOutlined />,
      },
      {
        key: "/admin/system-prompts/speaking-assessment",
        label: (
          <Link to="/admin/system-prompts/speaking-assessment">
            Speaking Assessment Prompts
          </Link>
        ),
        icon: <ApiOutlined />,
      },
      {
        key: "/admin/system-prompts/blog-summarization",
        label: (
          <Link to="/admin/system-prompts/blog-summarization">
            Blog Summarization Prompts
          </Link>
        ),
        icon: <ApiOutlined />,
      },
    ],
  },
];

export default function AdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [collapsed, setCollapsed] = useState(false);
    const [activeMenu, setActiveMenu] = useState("/admin");
    const [openKeys, setOpenKeys] = useState([]);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    
    // Redux state
    const isAuthenticated = useAppSelector(state => state.account.isAuthenticated);
    const user = useAppSelector(state => state.account.user);

    useEffect(() => {
        const path = location.pathname.startsWith("/admin") ? location.pathname : "/admin";
        setActiveMenu(path);
        setOpenKeys((prev) => {
            let next = [...prev];
            if (TEST_SET_ROUTES.includes(path)) {
                if (!next.includes(TEST_SETS_SUBMENU_KEY)) next.push(TEST_SETS_SUBMENU_KEY);
            } else {
                next = next.filter((k) => k !== TEST_SETS_SUBMENU_KEY);
            }
            if (path.startsWith(PROMPT_ROUTE_PREFIX)) {
                if (!next.includes(PROMPTS_SUBMENU_KEY)) next.push(PROMPTS_SUBMENU_KEY);
            } else {
                next = next.filter((k) => k !== PROMPTS_SUBMENU_KEY);
            }
            const inTestsSection =
                path === "/admin/tests" ||
                path.startsWith("/admin/tests/") ||
                path === "/admin/speaking-tests" ||
                path.startsWith("/admin/speaking-tests/") ||
                path === "/admin/writing-tests" ||
                path.startsWith("/admin/writing-tests/");
            if (inTestsSection) {
                if (!next.includes(TESTS_SUBMENU_KEY)) next.push(TESTS_SUBMENU_KEY);
            } else {
                next = next.filter((k) => k !== TESTS_SUBMENU_KEY);
            }
            return next;
        });
    }, [location.pathname]);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logoutApi();
            message.success('Logged out successfully!');
        } catch (error) {
            message.warning('Logout failed on the server, but you have been logged out locally');
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
                    <BugOutlined /> {currentRole === "STAFF" ? "STAFF" : "ADMIN"}
                </div>
                <Menu
                    selectedKeys={[activeMenu]}
                    openKeys={openKeys}
                    onOpenChange={setOpenKeys}
                    mode="inline"
                    items={filteredMenu}
                    onClick={(e) => {
                        const { key } = e;
                        if (key === "/admin" || key.startsWith("/admin/")) {
                            setActiveMenu(key);
                        }
                    }}
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
