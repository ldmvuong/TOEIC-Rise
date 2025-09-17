// Header.jsx
import { useState, useRef, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"

export default function Header({ user, onLogin, onLogout, currentPath }) {
  const [isUserOpen, setIsUserOpen] = useState(false)
  const userMenuRef = useRef(null)
  const navigate = useNavigate()

  const nav = [
    { name: "Home", href: "/" },
    { name: "Cấu trúc đề thi", href: "/exam-structure" },
    { name: "Đề thi online", href: "/online-tests" },
    { name: "ChatAI", href: "/chat-ai" },
  ]

  const activePath = typeof currentPath === "string" ? currentPath : "/"

  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
                <div className="h-3 w-3 rounded-full bg-green-600" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-blue-800 leading-none">TOEIC RISE</span>
              <span className="text-xs text-gray-600 leading-none mt-0.5">Online Testing System</span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-8">
            {nav.map((item) => {
              const isActive = activePath === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`text-sm font-medium transition-colors ${
                    isActive
                      ? "text-blue-600 border-b-2 border-blue-600 pb-1"
                      : "text-gray-700 hover:text-blue-600"
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User / Auth */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50"
                >
                  <div className="h-8 w-8 overflow-hidden rounded-full bg-gray-200">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white bg-blue-600">
                        {user.name?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{user.name}</span>
                </button>

                {isUserOpen && (
                  <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                    <a href="#" className="block px-3 py-2 text-sm hover:bg-gray-50">
                      Trang cá nhân
                    </a>
                    <a href="#" className="block px-3 py-2 text-sm hover:bg-gray-50">
                      Lịch sử đề thi
                    </a>
                    <div className="my-1 h-px bg-gray-200" />
                    <button
                      onClick={onLogout}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                className="rounded-md border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Đăng nhập
              </button>
            )}

            <Link
              to="/learning"
              className="rounded-md bg-green-600 px-5 py-1.5 text-sm font-semibold text-white hover:bg-green-700"
            >
              Vào học
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
