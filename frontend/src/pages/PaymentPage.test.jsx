import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { adapter } from '../api';
import { createMockAdapter } from '../api/adapters/mockAdapter';
import { clearSession, saveSession } from '../features/auth/session';
import { addRecentOrder } from '../features/orders/recentOrders';
import { LocationDisplay, renderWithProviders } from '../test/renderWithProviders';
import PaymentPage from './PaymentPage';

vi.mock('../api', async () => {
  const { createMockAdapter: create } = await import('../api/adapters/mockAdapter');
  return { adapter: create(0) };
});

const PHONE = '0901234567';
const request = (over = {}) => ({
  client_request_id: `rid-${Math.random()}`,
  customer: { name: 'Nguyễn An', phone: PHONE },
  address: { province_id: 'hn', ward_id: 'hn-1', street: '12 Lê Lợi' },
  note: '', payment_method: 'wallet',
  items: [{ product_id: 'tra-dao', size_id: 'm', topping_ids: ['thach'], note: '', quantity: 2 }],
  ...over,
});
async function placeOrder(over, source = adapter, remember = true) {
  const order = await source.createOrder(request(over));
  if (remember) addRecentOrder({ id: order.id, phone: PHONE, createdAt: order.created_at });
  return order;
}
const renderPayment = (id) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/payment/:id" element={<PaymentPage />} />
        <Route path="/orders/:id" element={<div>TRANG THEO DÕI</div>} />
      </Routes>
      <LocationDisplay />
    </>,
    { route: `/payment/${id}` },
  );

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

it('đơn online mới: hiện tổng tiền, QR và đồng hồ "05:00"', async () => {
  const { id } = await placeOrder();
  renderPayment(id);
  expect(await screen.findByRole('img', { name: 'Mã QR mẫu' })).toBeInTheDocument();
  expect(screen.getByText(/129\.000/)).toBeInTheDocument();
  expect(screen.getByText('05:00')).toBeInTheDocument();
});
it('bấm "Giả lập đã thanh toán" → chuyển tới /orders/<id>', async () => {
  const { id } = await placeOrder();
  renderPayment(id);
  await userEvent.click(await screen.findByRole('button', { name: 'Giả lập đã thanh toán' }));
  expect(await screen.findByText('TRANG THEO DÕI')).toBeInTheDocument();
  expect(screen.getByTestId('location')).toHaveTextContent(`/orders/${id}`);
});
it('đơn tiền mặt → chuyển thẳng /orders/<id>', async () => {
  const { id } = await placeOrder({ payment_method: 'cash' });
  renderPayment(id);
  expect(await screen.findByText('TRANG THEO DÕI')).toBeInTheDocument();
});
it('đơn đã quá hạn (backend báo expired): hiện thông báo hết hạn và link Về Menu', async () => {
  const old = createMockAdapter(0, () => Date.now() - 400000);
  const { id } = await placeOrder({}, old);
  renderPayment(id);
  expect(await screen.findByText('Đơn đã hết hạn thanh toán')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Về Menu' })).toHaveAttribute('href', '/menu');
  expect(screen.queryByRole('button', { name: 'Giả lập đã thanh toán' })).toBeNull();
});
it('quá hạn phía client trước khi backend cập nhật: đồng hồ dừng "00:00", không âm', async () => {
  const { id } = await placeOrder();
  const past = new Date(Date.now() - 60000).toISOString();
  vi.spyOn(adapter, 'getOrder').mockResolvedValue({
    ...(await adapter.getOrder(id, PHONE)), status: 'awaiting_payment', payment_status: 'pending',
    payment: { expires_at: past, qr_content: 'COFFEE-x' },
  });
  renderPayment(id);
  expect(await screen.findByText('Đơn đã hết hạn thanh toán')).toBeInTheDocument();
  expect(screen.getByText('00:00')).toBeInTheDocument();
});
it('chưa có trong đơn gần đây → PhoneGate; nhập SĐT đúng thì tải đơn', async () => {
  const { id } = await placeOrder({}, adapter, false);
  renderPayment(id);
  await userEvent.type(screen.getByLabelText('Số điện thoại'), PHONE);
  await userEvent.click(screen.getByRole('button', { name: 'Xem đơn' }));
  expect(await screen.findByRole('img', { name: 'Mã QR mẫu' })).toBeInTheDocument();
});
it('SĐT không khớp: hiện "Không tìm thấy đơn với mã và số điện thoại này."', async () => {
  const { id } = await placeOrder({}, adapter, false);
  addRecentOrder({ id, phone: '0911111111', createdAt: new Date().toISOString() });
  renderPayment(id);
  expect(await screen.findByText('Không tìm thấy đơn với mã và số điện thoại này.')).toBeInTheDocument();
});

it('đơn online của chính mình (đã đăng nhập) mở không cần SĐT', async () => {
  const user = await adapter.register({ name: 'An', email: 'an@x.vn', password: 'matkhau123' });
  saveSession({ token: user.token, expiresAt: user.expires_at });
  const { id } = await adapter.createOrder(request());
  renderPayment(id);
  expect(await screen.findByRole('img', { name: 'Mã QR mẫu' })).toBeInTheDocument();
  expect(screen.queryByLabelText('Số điện thoại')).toBeNull();
  clearSession();
});
