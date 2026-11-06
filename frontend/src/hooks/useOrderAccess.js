import { useEffect, useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { addRecentOrder, findRecentOrder } from '../features/orders/recentOrders';
import { useOrder } from './useOrder';

const NOT_FOUND = 404;

// SĐT lấy từ đơn gần đây của trình duyệt. Không có SĐT mà đã đăng nhập thì thử như chủ đơn (token);
// khách chưa đăng nhập, hoặc đơn không phải của mình (404), thì phải hỏi SĐT (PhoneGate).
// Đang kiểm tra phiên (loading) thì chưa hỏi gì để không nháy PhoneGate.
export function useOrderAccess(id) {
  const { status, user } = useAuth();
  const [phone, setPhone] = useState(() => findRecentOrder(id)?.phone ?? '');
  const query = useOrder(id, phone, user?.id);
  const order = query.data;

  useEffect(() => {
    if (order && phone && !findRecentOrder(order.id)) {
      addRecentOrder({ id: order.id, phone, createdAt: order.createdAt });
    }
  }, [order, phone]);

  const ownerLookupFailed = !phone && Boolean(user) && query.isError && query.error.status === NOT_FOUND;
  const needsPhone = !phone && (status === 'anonymous' || ownerLookupFailed);
  return { phone, setPhone, query, needsPhone };
}
