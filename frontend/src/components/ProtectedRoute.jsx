import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import Skeleton from './Skeleton';

export default function ProtectedRoute() {
  const { status } = useAuth();
  const { pathname, search } = useLocation();

  // Đang hỏi /me: chờ, đừng nháy sang trang đăng nhập rồi quay lại.
  if (status === 'loading') return <Skeleton height="320px" />;
  if (status === 'anonymous') {
    return <Navigate replace to={`/login?returnTo=${encodeURIComponent(pathname + search)}`} />;
  }
  return <Outlet />;
}
