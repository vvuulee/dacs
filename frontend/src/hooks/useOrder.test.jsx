import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createQueryClient } from '../api/queryClient';
import { POLL_INTERVAL_MS } from '../constants';
import { getOrder } from '../services/orderService';
import { useOrder } from './useOrder';

vi.mock('../services/orderService', () => ({ getOrder: vi.fn(), createOrder: vi.fn(), simulatePayment: vi.fn() }));
const wrapper = ({ children }) => <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>;
const tick = (ms) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
// TanStack Query đẩy kết quả sang React qua timer vừa được tạo: với timer giả cần tiến thêm 1ms (0ms chưa đủ).
const poll = async (ms = POLL_INTERVAL_MS) => { await tick(ms); await tick(1); };
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.useRealTimers());

it('không gọi khi thiếu phone', () => {
  renderHook(() => useOrder('CF1', ''), { wrapper });
  expect(getOrder).not.toHaveBeenCalled();
});
it('polling: placed → preparing → delivered rồi dừng', async () => {
  vi.useFakeTimers();
  getOrder
    .mockResolvedValueOnce({ id: 'CF1', status: 'placed' })
    .mockResolvedValueOnce({ id: 'CF1', status: 'preparing' })
    .mockResolvedValue({ id: 'CF1', status: 'delivered' });
  const { result } = renderHook(() => useOrder('CF1', '0901234567'), { wrapper });
  await tick(0);
  expect(result.current.data.status).toBe('placed');
  await poll();
  expect(result.current.data.status).toBe('preparing');
  await poll();
  expect(result.current.data.status).toBe('delivered');
  const calls = getOrder.mock.calls.length;
  await poll(POLL_INTERVAL_MS * 3);
  expect(getOrder).toHaveBeenCalledTimes(calls);
});
it('không thử lại khi 404', async () => {
  getOrder.mockRejectedValue(Object.assign(new Error('Không tìm thấy đơn'), { status: 404 }));
  const { result } = renderHook(() => useOrder('CF1', '0901234567'), { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(getOrder).toHaveBeenCalledTimes(1);
});

it('có userId, không phone (chủ đơn đã đăng nhập): vẫn gọi service', async () => {
  getOrder.mockResolvedValue({ id: 'CF1', status: 'placed' });
  const { result } = renderHook(() => useOrder('CF1', '', 'u1'), { wrapper });
  await waitFor(() => expect(result.current.data).toBeDefined());
  expect(getOrder).toHaveBeenCalledWith('CF1', '');
});
it('hai userId khác nhau không dùng chung cache của cùng một mã đơn', async () => {
  getOrder.mockResolvedValue({ id: 'CF1', status: 'delivered' });
  const client = createQueryClient();
  const shared = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const first = renderHook(() => useOrder('CF1', '', 'u1'), { wrapper: shared });
  await waitFor(() => expect(first.result.current.data).toBeDefined());
  const second = renderHook(() => useOrder('CF1', '', 'u2'), { wrapper: shared });
  await waitFor(() => expect(second.result.current.data).toBeDefined());
  expect(getOrder).toHaveBeenCalledTimes(2);
});
