import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { useEffect } from "react";
import NotFound from '../src/components/shared/not.found.jsx'
import ClientLayout from "./layouts/ClientLayout.jsx";
import HomePage from './pages/client/HomePage.jsx';
import AdminLayout from "./layouts/AdminLayout.jsx";
import Dashboard from "./pages/admin/Dashboard.jsx";
import AuthPage from "./pages/auth/AuthPage.jsx";
import { useAppDispatch, useAppSelector } from "./redux/hooks";
import { fetchAccount } from "./redux/slices/accountSlide";


export default function App() {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector((state) => state.account.isLoading);

  useEffect(() => {
    if (
      window.location.pathname === '/auth' ||
      window.location.pathname === '/login' ||
      window.location.pathname === '/register'
    )
      return;

    dispatch(fetchAccount());
  }, [dispatch]);

  const router = createBrowserRouter([
    {
      path: '/',
      element: <ClientLayout />,
      errorElement: <NotFound />,
      children: [
        { index: true, element: <HomePage /> }, // Trang mặc định khi vào '/'
      ],
    },
    {
      path: "/auth",
      element: <AuthPage />,
    },
    {
      path: "/admin",
      element: <AdminLayout />,
      children: [
        { index: true, element: <Dashboard /> },
      ],
    },
  ]);

  // Show loading spinner while fetching account info
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}