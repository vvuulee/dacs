import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../features/auth/AuthContext';
import { getMyOrders } from '../services/authService';

// Khóa theo user.id: dù cache có sót, người sau không bao giờ nhận dữ liệu của người trước.
export function useMyOrders() {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: ['my-orders', user?.id],
    queryFn: getMyOrders,
    enabled: status === 'authenticated',
  });
}
