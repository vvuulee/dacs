import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { adapter } from '../api';
import { ApiError } from '../api/client';
import { POLL_INTERVAL_MS } from '../constants';
import { ORDER_NOT_FOUND_TEXT } from '../features/orders/orderStatus';
import { addRecentOrder, findRecentOrder } from '../features/orders/recentOrders';
import { clearSession, saveSession } from '../features/auth/session';
import { renderWithProviders } from '../test/renderWithProviders';
import OrderTrackingPage from './OrderTrackingPage';

vi.mock('../api', async () => {
  const { createMockAdapter } = await import('../api/adapters/mockAdapter');
  return { adapter: createMockAdapter(0) };
});

const PHONE = '0901234567';
const request = (over = {}) => ({
  client_request_id: `rid-${Math.random()}`,
  customer: { name: 'Nguyễn An', phone: PHONE },
  address: { province_id: 'hn', ward_id: 'hn-1', street: '12 Lê Lợi' },
  note: '', payment_method: 'cash',
  items: [{ product_id: 'tra-dao', size_id: 'm', topping_ids: ['thach'], note: 'ít đá', quantity: 2 }],
  ...over,
});
async function placeOrder(over, phone = PHONE) {
  const order = await adapter.createOrder(request(over));
  if (phone) addRecentOrder({ id: order.id, phone, createdAt: order.created_at });
  return order;
}
const renderTracking = (id) =>
  renderWithProviders(<Routes><Route path="/orders/:id" element={<OrderTrackingPage />} /></Routes>, { route: `/orders/${id}` });

beforeEach(() => localStorage.clear());
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

it('hiện mã đơn, món, phí giao, tổng, địa chỉ và trạng thái thanh toán', async () => {
  const { id } = await placeOrder();
  renderTracking(id);
  expect(await screen.findByText(id)).toBeInTheDocument();
  expect(screen.getByText('Trà đào cam sả')).toBeInTheDocument();
  expect(screen.getByText('Phí giao hàng').parentElement).toHaveTextContent(/15\.000/);
  expect(screen.getByText('Tổng cộng').parentElement).toHaveTextContent(/129\.000/);
  expect(screen.getByText(/12 Lê Lợi, Phường Mẫu 1, Hà Nội/)).toBeInTheDocument();
  expect(screen.getByText('Thanh toán khi nhận hàng')).toBeInTheDocument();
  expect(screen.getByText('Chờ xác nhận').closest('li')).toHaveAttribute('aria-current', 'step');
});
it('SĐT trong đơn gần đây sai → cùng thông báo không tìm thấy đơn', async () => {
  const { id } = await placeOrder({}, '0911111111');
  renderTracking(id);
  expect(await screen.findByText(ORDER_NOT_FOUND_TEXT)).toBeInTheDocument();
});
it('chưa có trong đơn gần đây → PhoneGate; nhập đúng thì hiện đơn và nhớ vào đơn gần đây', async () => {
  const { id } = await placeOrder({}, '');
  renderTracking(id);
  await userEvent.type(screen.getByLabelText('Số điện thoại'), '+84 901 234 567');
  await userEvent.click(screen.getByRole('button', { name: 'Xem đơn' }));
  expect(await screen.findByText('Trà đào cam sả')).toBeInTheDocument();
  expect(findRecentOrder(id)).toMatchObject({ phone: PHONE });
});
it('đơn awaiting_payment có link "Thanh toán ngay" → /payment/<id>', async () => {
  const { id } = await placeOrder({ payment_method: 'wallet' });
  renderTracking(id);
  expect(await screen.findByRole('link', { name: 'Thanh toán ngay' })).toHaveAttribute('href', `/payment/${id}`);
});
it('polling mất kết nối sau lần đầu → giữ dữ liệu và hiện "Mất kết nối, đang thử lại"', async () => {
  const raw = await adapter.createOrder(request());
  addRecentOrder({ id: raw.id, phone: PHONE, createdAt: raw.created_at });
  vi.useFakeTimers();
  vi.spyOn(adapter, 'getOrder')
    .mockResolvedValueOnce(raw)
    .mockRejectedValue(new ApiError(0, 'Không kết nối được tới máy chủ'));
  renderTracking(raw.id);
  const tick = (ms) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
  await tick(1);
  expect(screen.getByText('Trà đào cam sả')).toBeInTheDocument();
  await tick(POLL_INTERVAL_MS + 3000);
  await tick(1);
  expect(screen.getByText('Trà đào cam sả')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Mất kết nối, đang thử lại');
});

describe('khi đã đăng nhập', () => {
  async function signUp(email) {
    const result = await adapter.register({ name: 'User', email, password: 'matkhau123' });
    saveSession({ token: result.token, expiresAt: result.expires_at });
  }
  afterEach(() => clearSession());

  it('đơn của chính mình mở không cần SĐT (không có PhoneGate)', async () => {
    await signUp('a@x.vn');
    const order = await adapter.createOrder(request());
    renderTracking(order.id);
    expect(await screen.findByText('Trà đào cam sả')).toBeInTheDocument();
    expect(screen.queryByLabelText('Số điện thoại')).toBeNull();
  });
  it('đơn của người khác → PhoneGate; nhập SĐT đúng thì xem được', async () => {
    const guestOrder = await adapter.createOrder(request());
    await signUp('b@x.vn');
    renderTracking(guestOrder.id);
    await userEvent.type(await screen.findByLabelText('Số điện thoại'), PHONE);
    await userEvent.click(screen.getByRole('button', { name: 'Xem đơn' }));
    expect(await screen.findByText('Trà đào cam sả')).toBeInTheDocument();
  });
  it('AuthContext còn loading → không nháy PhoneGate, chưa lộ đơn', async () => {
    await signUp('a@x.vn');
    const order = await adapter.createOrder(request());
    vi.spyOn(adapter, 'getMe').mockReturnValue(new Promise(() => {}));
    renderTracking(order.id);
    expect(screen.queryByLabelText('Số điện thoại')).toBeNull();
    expect(screen.queryByText('Trà đào cam sả')).toBeNull();
  });
});

describe('giảm giá', () => {
  it('đơn có mã: dòng Giảm giá có dấu trừ và "Mã giảm giá: CHAO10"', async () => {
    const { id } = await placeOrder({ voucher_code: 'CHAO10' });
    renderTracking(id);
    const row = (await screen.findByText('Giảm giá')).parentElement;
    expect(row).toHaveTextContent(/−/);
    expect(row).toHaveTextContent(/11\.400/);
    expect(screen.getByText('Mã giảm giá')).toBeInTheDocument();
    expect(screen.getByText('CHAO10')).toBeInTheDocument();
  });
  it('đơn không có mã: không hiện hai dòng đó', async () => {
    const { id } = await placeOrder();
    renderTracking(id);
    await screen.findByText('Trà đào cam sả');
    expect(screen.queryByText('Giảm giá')).toBeNull();
    expect(screen.queryByText('Mã giảm giá')).toBeNull();
  });
});
