// Header.jsx
import { useState, useRef, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "../../redux/hooks"
import { setLogoutAction } from "../../redux/slices/accountSlide"
import { logout as logoutApi } from "../../api/api"

export default function Header({ currentPath }) {
  const [isUserOpen, setIsUserOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const userMenuRef = useRef(null)
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  
  // Redux state
  const isAuthenticated = useAppSelector(state => state.account.isAuthenticated)
  const user = useAppSelector(state => state.account.user)
  const isLearner = user?.role === 'LEARNER'

  const navItems = [
    { name: "Home", href: "/" },
    { name: "Đề thi online", href: "/online-tests" },
    { name: "Thống kê kết quả", href: "/statistics", roles: ['LEARNER'] },
    { name: "Cấu trúc đề thi", href: "/exam-structure" },
  ]

  const nav = navItems.filter(item => {
    if (!item.roles || item.roles.length === 0) return true
    if (item.roles.includes('LEARNER')) return isLearner
    return false
  })

  const activePath = typeof currentPath === "string" ? currentPath : "/"

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logoutApi()
    } catch (error) {
      // Vẫn tiếp tục logout local dù API có lỗi
    } finally {
      dispatch(setLogoutAction())
      navigate('/')
      setIsUserOpen(false)
      setIsLoggingOut(false)
    }
  }

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
            {isAuthenticated && user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50"
                >
                  <div className="h-8 w-8 overflow-hidden rounded-full bg-gray-200">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.fullName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white bg-blue-600">
                        {user.fullName?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{user.fullName}</span>
                </button>

                {isUserOpen && (
                  <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                    {(user.role === 'ADMIN' || user.role === 'STAFF') && (
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
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
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
          </div>
        </div>
      </div>
    </header>
  )
}
