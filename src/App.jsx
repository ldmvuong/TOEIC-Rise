import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { useEffect } from "react";
import NotFound from '../src/components/shared/not.found.jsx'
import ClientLayout from "./layouts/ClientLayout.jsx";
import HomePage from './pages/client/HomePage.jsx';
import AdminLayout from "./layouts/AdminLayout.jsx";
import Dashboard from "./pages/admin/Dashboard.jsx";
import TestSetPage from "./pages/admin/TestSet.jsx";
import TestPage from "./pages/admin/Test.jsx";
import AuthPage from "./pages/auth/AuthPage.jsx";
import ProtectedRoute, { GuestOnlyRoute } from "./components/shared/protected-route/index.jsx";
import GoogleCallbackHandler from "./components/auth/GoogleCallbackHandler.jsx";
import RefreshTokenHandler from "./components/shared/RefreshTokenHandler.jsx";
import { useAppDispatch, useAppSelector } from "./redux/hooks";
import { fetchAccount } from "./redux/slices/accountSlide";


export default function App() {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector((state) => state.account.isLoading);

  useEffect(() => {
    dispatch(fetchAccount());
  }, [dispatch]);

  const router = createBrowserRouter([
    {
      path: '/',
      element: (
        <>
          <ClientLayout />
          <RefreshTokenHandler />
        </>
      ),
      errorElement: <NotFound />,
      children: [
        { index: true, element: <HomePage /> }
      ],
    },
    {
      path: "/auth",
      element: (
        <>
          <GuestOnlyRoute>
            <AuthPage />
          </GuestOnlyRoute>
          <RefreshTokenHandler />
        </>
      ),
    },
    {
      path: "/auth/google/callback",
      element: <GoogleCallbackHandler />,
    },
    {
      path: "/oauth2/callback",
      element: <GoogleCallbackHandler />,
    },
    {
      path: "/admin",
      element: (
        <>
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminLayout />
          </ProtectedRoute>
          <RefreshTokenHandler />
        </>
      ),
      children: [
        { index: true, element: <Dashboard /> },
        {
          path: 'test-sets',
          element: (
            <TestSetPage />
          ),
        },
        {
          path: 'tests',
          element: (
            <TestPage />
          ),
        },
      ],
    },
  ]);

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