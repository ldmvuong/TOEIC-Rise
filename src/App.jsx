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
import BlogCategoriesPage from "./pages/admin/BlogCategories.jsx";
import BlogCategoryDetailPage from "./pages/admin/BlogCategoryDetail.jsx";
import BlogPostCreatePage from "./pages/admin/BlogPostCreate.jsx";
import BlogPostDetailPage from "./pages/admin/BlogPostDetail.jsx";
import TestDetail from "./pages/client/TestDetail.jsx";
import DoTest from "./pages/client/DoTest.jsx";
import DoMiniTest from "./pages/client/DoMiniTest.jsx";
import MiniTestResult from "./pages/client/MiniTestResult.jsx";
import TestResult from "./pages/client/TestResult.jsx";
import TestResultDetail from "./pages/client/TestResultDetail.jsx";
import RedoWrong from "./pages/client/RedoWrong.jsx";
import FixWrongOneByOne from "./pages/client/FixWrongOneByOne.jsx";
import TestAnalytics from "./pages/client/TestAnalytics.jsx";
import ExamStructure from "./pages/client/ExamStructure.jsx";
import FlashcardLibrary from "./pages/client/FlashcardLibrary.jsx";
import FlashcardCreatePage from "./pages/client/FlashcardCreatePage.jsx";
import FlashcardViewPage from "./pages/client/FlashcardViewPage.jsx";
import FlashcardEditPage from "./pages/client/FlashcardEditPage.jsx";
import FlashcardPracticePlaceholder from "./pages/client/FlashcardPracticePlaceholder.jsx";
import FlashcardMatchPage from "./pages/client/FlashcardMatchPage.jsx";
import FlashcardQuizPage from "./pages/client/FlashcardQuizPage.jsx";
import FlashcardTypePage from "./pages/client/FlashcardTypePage.jsx";
import FlashcardSentencePracticePage from "./pages/client/FlashcardSentencePracticePage.jsx";
import FlashcardDueChoosePage from "./pages/client/FlashcardDueChoosePage.jsx";
import SystemPromptsChatbot from "./pages/admin/SystemPromptsChatbot.jsx";
import SystemPromptsQAndA from "./pages/admin/SystemPromptsQAndA.jsx";
import SystemPromptsExplanation from "./pages/admin/SystemPromptsExplanation.jsx";
import SystemPromptsSentenceAssessment from "./pages/admin/SystemPromptsSentenceAssessment.jsx";
import SystemPromptDetailPage from "./pages/admin/SystemPromptDetail.jsx";


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
          path: 'redo-wrong/:userTestId',
          element: (
            <ProtectedRoute allowedRoles={['LEARNER']}>
              <RedoWrong />
            </ProtectedRoute>
          )
        },
        {
          path: 'fix-wrong-one-by-one/:userTestId',
          element: (
            <ProtectedRoute allowedRoles={['LEARNER']}>
              <FixWrongOneByOne />
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
          path: 'flashcards/due',
          element: (
            <ProtectedRoute allowedRoles={['LEARNER']}>
              <FlashcardDueChoosePage />
            </ProtectedRoute>
          )
        },
        {
          path: 'flashcards/due/match',
          element: (
            <ProtectedRoute allowedRoles={['LEARNER']}>
              <FlashcardMatchPage />
            </ProtectedRoute>
          )
        },
        {
          path: 'flashcards/due/quiz',
          element: (
            <ProtectedRoute allowedRoles={['LEARNER']}>
              <FlashcardQuizPage />
            </ProtectedRoute>
          )
        },
        {
          path: 'flashcards/due/type',
          element: (
            <ProtectedRoute allowedRoles={['LEARNER']}>
              <FlashcardTypePage />
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
        },
        {
          path: 'flashcards/:id/match',
          element: (
            <ProtectedRoute allowedRoles={['LEARNER']}>
              <FlashcardMatchPage />
            </ProtectedRoute>
          )
        },
        {
          path: 'flashcards/:id/quiz',
          element: (
            <ProtectedRoute allowedRoles={['LEARNER']}>
              <FlashcardQuizPage />
            </ProtectedRoute>
          )
        },
        {
          path: 'flashcards/:id/type',
          element: (
            <ProtectedRoute allowedRoles={['LEARNER']}>
              <FlashcardTypePage />
            </ProtectedRoute>
          )
        },
        {
          path: 'flashcards/:id/sentence-practice',
          element: (
            <ProtectedRoute allowedRoles={['LEARNER']}>
              <FlashcardSentencePracticePage />
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
        {
          path: 'blog-categories',
          element: (
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
              <BlogCategoriesPage />
            </ProtectedRoute>
          ),
        },
        {
          path: 'blog-categories/:id/posts/new',
          element: (
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
              <BlogPostCreatePage />
            </ProtectedRoute>
          ),
        },
        {
          path: 'blog-posts/:id',
          element: (
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
              <BlogPostDetailPage />
            </ProtectedRoute>
          ),
        },
        {
          path: 'blog-categories/:id',
          element: (
            <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
              <BlogCategoryDetailPage />
            </ProtectedRoute>
          ),
        },
        {
          path: 'system-prompts/chatbot',
          element: (
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <SystemPromptsChatbot />
            </ProtectedRoute>
          ),
        },
        {
          path: 'system-prompts/q-and-a',
          element: (
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <SystemPromptsQAndA />
            </ProtectedRoute>
          ),
        },
        {
          path: 'system-prompts/explanation',
          element: (
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <SystemPromptsExplanation />
            </ProtectedRoute>
          ),
        },
        {
          path: 'system-prompts/sentence-assessment',
          element: (
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <SystemPromptsSentenceAssessment />
            </ProtectedRoute>
          ),
        },
        {
          path: 'system-prompts/:type/:id',
          element: (
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <SystemPromptDetailPage />
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