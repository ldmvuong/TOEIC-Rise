import { Navigate } from "react-router-dom";
import { useAppSelector } from "@/redux/hooks";
import NotPermitted from "./not-permitted";
import Loading from '../loading';

const RoleBaseRoute = ({ allowedRoles, children }) => {
  const user = useAppSelector(state => state.account.user);
  const userRole = user?.role;

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const isAllowed = allowedRoles.includes(userRole);
    if (!isAllowed) return <NotPermitted />;
  }

  return <>{children}</>;
};

const ProtectedRoute = (props) => {
  const isAuthenticated = useAppSelector(state => state.account.isAuthenticated);
  const isLoading = useAppSelector(state => state.account.isLoading);
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('access_token');

  if (!isAuthenticated) {
    if (isLoading || hasToken) {
      return <Loading />;
    }
    return <Navigate to="/auth" replace />;
  }

  return (
    <RoleBaseRoute allowedRoles={props.allowedRoles}>
      {props.children}
    </RoleBaseRoute>
  );
};

export default ProtectedRoute;

export const GuestOnlyRoute = (props) => {
  const isAuthenticated = useAppSelector(state => state.account.isAuthenticated);
  const isLoading = useAppSelector(state => state.account.isLoading);
  const user = useAppSelector(state => state.account.user);

  if (isLoading) return <Loading />;

  if (isAuthenticated) {
    const redirectPath = user?.role === 'ADMIN' ? '/admin' : '/';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{props.children}</>;
};
