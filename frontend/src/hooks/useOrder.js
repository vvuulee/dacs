import { useQuery } from '@tanstack/react-query';
import { POLL_INTERVAL_MS } from '../constants';
import { isFinalStatus } from '../features/orders/orderStatus';
import { getOrder } from '../services/orderService';

// Khóa gồm phone và userId: nhập sai rồi nhập đúng SĐT, hay đổi tài khoản, đều phải tải lại
// chứ không dùng kết quả (kể cả 404) đã cache của lần trước. Chủ đơn đã đăng nhập không cần phone.
export const useOrder = (id, phone, userId) =>
  useQuery({
    queryKey: ['order', id, phone, userId ?? 'guest'],
    queryFn: () => getOrder(id, phone),
    enabled: Boolean(id && (phone || userId)),
    refetchInterval: (query) => (isFinalStatus(query.state.data?.status) ? false : POLL_INTERVAL_MS),
  });
