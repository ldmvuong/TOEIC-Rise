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
import ReportPage from "./pages/admin/Report.jsx";
import ReportDetailPage from "./pages/admin/ReportDetail.jsx";
import QuestionGroupPage from "./pages/admin/QuestionGroup.jsx";
import AnalyticsPage from "./pages/admin/Analytics.jsx";
import TagsPage from "./pages/admin/Tags.jsx";
import TestDetail from "./pages/client/TestDetail.jsx";
import DoTest from "./pages/client/DoTest.jsx";
import DoMiniTest from "./pages/client/DoMiniTest.jsx";
import MiniTestResult from "./pages/client/MiniTestResult.jsx";
import TestResult from "./pages/client/TestResult.jsx";
import TestResultDetail from "./pages/client/TestResultDetail.jsx";
import TestAnalytics from "./pages/client/TestAnalytics.jsx";
import ExamStructure from "./pages/client/ExamStructure.jsx";
import FlashcardLibrary from "./pages/client/FlashcardLibrary.jsx";
import FlashcardCreatePage from "./pages/client/FlashcardCreatePage.jsx";
import FlashcardViewPage from "./pages/client/FlashcardViewPage.jsx";
import FlashcardEditPage from "./pages/client/FlashcardEditPage.jsx";


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
          path: 'online-tests/:id/:slug?',
          element: <TestDetail />
        },
        {
          path: 'do-test',
          element: (
            <ProtectedRoute allowedRoles={['LEARNER']}>
              <DoTest />
            </ProtectedRoute>
          )
        },
        {
          path: 'do-mini-test',
          element: (
            <ProtectedRoute allowedRoles={['LEARNER']}>
              <DoMiniTest />
            </ProtectedRoute>
          )
        },
        {
          path: 'mini-test-result',
          element: (
            <ProtectedRoute allowedRoles={['LEARNER']}>
              <MiniTestResult />
            </ProtectedRoute>
          )
        },
        {
          path: 'test-result/:userTestId',
          element: (
            <ProtectedRoute allowedRoles={['LEARNER']}>
              <TestResult />
            </ProtectedRoute>
          )
        },
        {
          path: 'test-result-detail/:userTestId',
          element: (
            <ProtectedRoute allowedRoles={['LEARNER']}>
              <TestResultDetail />
            </ProtectedRoute>
          )
        },
        {
          path: 'statistics',
          element: (
            <ProtectedRoute allowedRoles={['LEARNER']}>
              <TestAnalytics />
            </ProtectedRoute>
          )
        },
        {
          path: 'profile',
          element: (
            <ProtectedRoute allowedRoles={['LEARNER', 'ADMIN', "STAFF"]}>
              <ClientProfile />
            </ProtectedRoute>
          )
        },
        {
          path: 'flashcards',
          element: (
            <ProtectedRoute allowedRoles={['LEARNER']}>
              <FlashcardLibrary />
            </ProtectedRoute>
          )
        },
        {
          path: 'flashcards/create',
          element: (
            <ProtectedRoute allowedRoles={['LEARNER']}>
              <FlashcardCreatePage />
            </ProtectedRoute>
          )
        },
        {
          path: 'flashcards/:id',
          element: (
            <ProtectedRoute allowedRoles={['LEARNER']}>
              <FlashcardViewPage />
            </ProtectedRoute>
          )
        },
        {
          path: 'flashcards/:id/edit',
          element: (
            <ProtectedRoute allowedRoles={['LEARNER']}>
              <FlashcardEditPage />
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
          <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
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
          <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
            <AdminLayout />
          </ProtectedRoute>
          <RefreshTokenHandler />
        </>
      ),
      children: [
        { 
          index: true, 
          element: (
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
              <Dashboard />
            </ProtectedRoute>
          ) 
        },
        {
          path: 'test-sets',
          element: (
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
              <TestSetPage />
            </ProtectedRoute>
          ),
        },
        {
          path: 'tests',
          element: (
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
              <TestPage />
            </ProtectedRoute>
          ),
        },
        {
          path: 'tests/:id',
          element: (
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
              <TestDetailPage />
            </ProtectedRoute>
          ),
        },
        {
          path: 'users',
          element: (
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
              <UserPage />
            </ProtectedRoute>
          ),
        },
        {
          path: 'reports',
          element: (
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
              <ReportPage />
            </ProtectedRoute>
          ),
        },
        {
          path: 'reports/:id',
          element: (
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
              <ReportDetailPage />
            </ProtectedRoute>
          ),
        },
        {
          path: 'question-groups/:id',
          element: (
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
              <QuestionGroupPage />
            </ProtectedRoute>
          ),
        },
        {
          path: 'analytics',
          element: (
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
              <AnalyticsPage />
            </ProtectedRoute>
          ),
        },
        {
          path: 'tags',
          element: (
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
              <TagsPage />
            </ProtectedRoute>
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