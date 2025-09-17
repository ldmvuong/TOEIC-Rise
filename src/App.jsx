import { createBrowserRouter, RouterProvider } from "react-router-dom";
import NotFound from '../src/components/shared/not.found.jsx'
import ClientLayout from "./layouts/ClientLayout.jsx";
import HomePage from './pages/client/HomePage.jsx';
import AdminLayout from "./layouts/AdminLayout.jsx";
import Dashboard from "./pages/admin/Dashboard.jsx";
import AuthPage from "./pages/auth/AuthPage.jsx";


export default function App() {

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

  return <RouterProvider router={router} />;
}