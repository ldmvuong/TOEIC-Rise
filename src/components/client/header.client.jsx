// Header.jsx
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { setLogoutAction } from "../../redux/slices/accountSlide";
import { logout as logoutApi } from "../../api/api";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";

export default function Header({ currentPath }) {
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Redux state
  const isAuthenticated = useAppSelector(
    (state) => state.account.isAuthenticated,
  );
  const user = useAppSelector((state) => state.account.user);
  const isLearner = user?.role === "LEARNER";

  const navItems = [
    { name: "Trang chủ", href: "/" },
    { name: "Đề thi online", href: "/online-tests" },
    { name: "Nghe chép chính tả", href: "/dictation", roles: ["LEARNER"] },
    { name: "Flashcard", href: "/flashcards", roles: ["LEARNER"] },
    { name: "Thống kê kết quả", href: "/statistics", roles: ["LEARNER"] },
    { name: "Cấu trúc đề thi", href: "/exam-structure" },
    { name: "Blog", href: "/blog" },
  ];

  const nav = navItems.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true;
    if (item.roles.includes("LEARNER")) return isLearner;
    return false;
  });

  const activePath = typeof currentPath === "string" ? currentPath : "/";

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutApi();
    } catch {
      // Vẫn tiếp tục logout local dù API có lỗi
    } finally {
      dispatch(setLogoutAction());
      navigate("/");
      setIsUserOpen(false);
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8 2xl:px-12">
        <div className="flex h-16 items-center gap-3 lg:gap-6">
          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
                <div className="h-3 w-3 rounded-full bg-green-600" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-blue-800 leading-none">
                TOEIC RISE
              </span>
              <span className="text-xs text-gray-600 leading-none mt-0.5">
                Online Testing System
              </span>
            </div>
          </Link>

          {/* Một hàng: flex-nowrap; tên user truncate để không đẩy menu xuống dòng */}
          <nav className="hidden min-w-0 flex-1 md:flex md:items-center md:justify-center">
            <div className="flex min-w-0 flex-nowrap items-center justify-center gap-x-1 sm:gap-x-1.5 md:gap-x-2 lg:gap-x-2.5 xl:gap-x-3 2xl:gap-x-4">
              {nav.map((item) => {
                const isTestHub =
                  item.href === "/online-tests" &&
                  (activePath === "/online-tests" ||
                    activePath.startsWith("/online-tests/") ||
                    activePath === "/speaking-tests" ||
                    activePath.startsWith("/speaking-tests/") ||
                    activePath === "/writing-tests" ||
                    activePath.startsWith("/writing-tests/"));
                const isActive =
                  isTestHub ||
                  (item.href === "/"
                    ? activePath === "/"
                    : activePath === item.href ||
                      activePath.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={[
                      "inline-flex h-8 items-center whitespace-nowrap px-0.5 text-sm font-medium transition-colors border-b-[3px]",
                      isActive
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-gray-700 hover:text-indigo-600",
                    ].join(" ")}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User / Auth — min-w-0 + truncate tên để nav luôn đủ chỗ một hàng */}
          <div className="ml-auto flex min-w-0 shrink items-center gap-2 sm:gap-4">
            <button
              onClick={() => window.dispatchEvent(new Event("open-tour"))}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-blue-600"
              title="Hướng dẫn"
            >
              <QuestionMarkCircleIcon className="h-6 w-6" />
            </button>
            {isAuthenticated && user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  id="user-menu-btn"
                  onClick={() => setIsUserOpen((v) => !v)}
                  className="flex min-w-0 max-w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50"
                >
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-gray-200">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white bg-blue-600">
                        {user.fullName?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                  <span
                    className="hidden min-w-0 max-w-[7rem] text-left text-sm font-medium text-gray-700 sm:max-w-[9rem] lg:inline xl:max-w-[11rem] 2xl:max-w-[14rem] truncate"
                    title={user.fullName}
                  >
                    {user.fullName}
                  </span>
                </button>

                {isUserOpen && (
                  <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                    {(user.role === "ADMIN" || user.role === "STAFF") && (
                      <Link
                        to="/admin"
                        className="block px-3 py-2 text-sm hover:bg-gray-50"
                        onClick={() => setIsUserOpen(false)}
                      >
                        Trang quản trị
                      </Link>
                    )}
                    <Link
                      to="/profile"
                      className="block px-3 py-2 text-sm hover:bg-gray-50"
                      onClick={() => setIsUserOpen(false)}
                    >
                      Trang cá nhân
                    </Link>
                    <div className="my-1 h-px bg-gray-200" />
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className={`w-full px-3 py-2 text-left text-sm ${
                        isLoggingOut
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-red-600 hover:bg-red-50"
                      }`}
                    >
                      {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                id="login-btn"
                onClick={() => navigate("/auth")}
                className="rounded-md border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Đăng nhập
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
