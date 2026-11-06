import { adapter } from '../api';
import { createOrder, getOrder, simulatePayment } from './orderService';

vi.mock('../api', () => ({ adapter: { createOrder: vi.fn(), getOrder: vi.fn(), simulatePayment: vi.fn() } }));

const raw = {
  id: 'CF1', status: 'placed', payment_method: 'cash', payment_status: 'unpaid',
  customer: { name: 'An', phone: '0901234567' }, address: { province_name: 'Hà Nội', ward_name: 'P1', street: '12 Lê Lợi' },
  items: [{ product_id: 'a', name: 'A', quantity: 1, unit_price: 1000 }],
  subtotal: 1000, delivery_fee: 15000, total: 16000, created_at: '2026-10-30T03:00:00.000Z', payment: null,
};

it('createOrder trả Order đã map', async () => {
  adapter.createOrder.mockResolvedValue(raw);
  expect(await createOrder({ client_request_id: 'r' })).toMatchObject({ id: 'CF1', deliveryFee: 15000, paymentMethod: 'cash' });
  expect(adapter.createOrder).toHaveBeenCalledWith({ client_request_id: 'r' });
});
it('getOrder chuẩn hóa SĐT trước khi gọi adapter', async () => {
  adapter.getOrder.mockResolvedValue(raw);
  await getOrder('CF1', '+84 901 234 567');
  expect(adapter.getOrder).toHaveBeenCalledWith('CF1', '0901234567');
});
it('simulatePayment trả Order đã map', async () => {
  adapter.simulatePayment.mockResolvedValue(raw);
  expect((await simulatePayment('CF1')).id).toBe('CF1');
});
it('simulatePayment thiếu ở adapter ném lỗi nêu "mock"', async () => {
  const saved = adapter.simulatePayment;
  delete adapter.simulatePayment;
  await expect(simulatePayment('CF1')).rejects.toThrow(/mock/);
  adapter.simulatePayment = saved;
});

it('getOrder không phone (chủ đơn đã đăng nhập) → adapter nhận undefined', async () => {
  adapter.getOrder.mockResolvedValue(raw);
  await getOrder('CF1', undefined);
  expect(adapter.getOrder).toHaveBeenLastCalledWith('CF1', undefined);
});
