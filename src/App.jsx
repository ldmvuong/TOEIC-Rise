import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { useEffect } from "react";
import NotFound from '../src/components/shared/not.found.jsx'
import ClientLayout from "./layouts/ClientLayout.jsx";
import HomePage from './pages/client/HomePage.jsx';
import TestList from './pages/client/TestList.jsx';
import ClientProfile from './pages/client/Profile.jsx';
import AdminLayout from "./layouts/AdminLayout.jsx";
import Dashboard from "./pages/admin/Dashboard.jsx";
import TestSetPage from "./pages/admin/TestSet.jsx";
import TestDetailPage from "./pages/admin/TestDetail.jsx";
import TestPage from "./pages/admin/Test.jsx";
import Profile from "./pages/admin/Profile.jsx";
import AuthPage from "./pages/auth/AuthPage.jsx";
import ProtectedRoute, { GuestOnlyRoute } from "./components/shared/protected-route/index.jsx";
import GoogleCallbackHandler from "./components/auth/GoogleCallbackHandler.jsx";
import RefreshTokenHandler from "./components/shared/RefreshTokenHandler.jsx";
import { useAppDispatch, useAppSelector } from "./redux/hooks";
import { fetchAccount } from "./redux/slices/accountSlide";
import UserPage from "./pages/admin/User.jsx";
import TestDetail from "./pages/client/TestDetail.jsx";
import DoTest from "./pages/client/DoTest.jsx";
import TestResult from "./pages/client/TestResult.jsx";
import ExamStructure from "./pages/client/ExamStructure.jsx";


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
        { index: true, element: <HomePage /> },
        {
          path: 'exam-structure',
          element: <ExamStructure />
        },
        {
          path: 'online-tests',
          element: <TestList />
        },
        {
          path: 'online-tests/:id/:slug',
          element: <TestDetail />
        },
        {
          path: 'do-test',
          element: (
            <ProtectedRoute allowedRoles={['LEARNER', 'ADMIN']}>
              <DoTest />
            </ProtectedRoute>
          )
        },
        {
          path: 'test-result/:userTestId',
          element: (
            <ProtectedRoute allowedRoles={['LEARNER', 'ADMIN']}>
              <TestResult />
            </ProtectedRoute>
          )
        },
        {
          path: 'profile',
          element: (
            <ProtectedRoute allowedRoles={['LEARNER', 'ADMIN']}>
              <ClientProfile />
            </ProtectedRoute>
          )
        }
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
      path: "/admin/profile",
      element: (
        <>
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminLayout />
          </ProtectedRoute>
          <RefreshTokenHandler />
        </>
      ),
      children: [
        { index: true, element: <Profile /> }
      ],
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
        {
          path: 'tests/:id',
          element: (
            <TestDetailPage />
          ),
        },
        {
          path: 'users',
          element: (
            <UserPage />
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