import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Skeleton from '../components/Skeleton';
import { useStaffAuth } from '../features/staff/StaffAuthContext';

export default function StaffRoute() {
  const { status } = useStaffAuth();
  const { pathname, search } = useLocation();

  if (status === 'loading') return <Skeleton height="320px" />;
  if (status === 'anonymous') {
    return <Navigate replace to={`/staff/login?returnTo=${encodeURIComponent(pathname + search)}`} />;
  }
  return <Outlet />;
}
