import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, Route, Routes } from 'react-router-dom';
import { adapter } from '../api';
import { ApiError } from '../api/client';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../features/auth/AuthContext';
import { clearSession, saveSession } from '../features/auth/session';
import { LocationDisplay, renderWithProviders } from '../test/renderWithProviders';
import AccountOrdersPage from './AccountOrdersPage';

vi.mock('../api', async () => {
  const { createMockAdapter } = await import('../api/adapters/mockAdapter');
  return { adapter: createMockAdapter(0) };
});

let auth;
function Capture() { auth = useAuth(); return null; }
const orderRequest = (quantity = 1) => ({
  client_request_id: `rid-${Math.random()}`, customer: { name: 'An', phone: '0901234567' },
  address: { province_id: 'hn', ward_id: 'hn-1', street: '12 Lê Lợi' }, note: '', payment_method: 'cash',
  items: [{ product_id: 'tra-dao', size_id: 'm', topping_ids: [], note: '', quantity }],
});
async function signUp(email) {
  const result = await adapter.register({ name: 'User', email, password: 'matkhau123' });
  saveSession({ token: result.token, expiresAt: result.expires_at });
}
const renderOrders = () =>
  renderWithProviders(
    <>
      <Capture />
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/account/orders" element={<AccountOrdersPage />} />
        </Route>
        <Route path="/login" element={<Link to="/account/orders">QUAY LẠI LỊCH SỬ</Link>} />
      </Routes>
      <LocationDisplay />
    </>,
    { route: '/account/orders' },
  );

beforeEach(() => { localStorage.clear(); clearSession(); });
afterEach(() => { vi.restoreAllMocks(); clearSession(); });

it('hiện đơn của mình mới nhất trước: link /orders/<id>, trạng thái và tổng tiền', async () => {
  await signUp('a@x.vn');
  const first = await adapter.createOrder(orderRequest(1));
  const second = await adapter.createOrder(orderRequest(2));
  renderOrders();
  const rows = await screen.findAllByRole('listitem');
  expect(rows).toHaveLength(2);
  expect(within(rows[0]).getByRole('link', { name: `Đơn ${second.id}` })).toHaveAttribute('href', `/orders/${second.id}`);
  expect(within(rows[1]).getByRole('link', { name: `Đơn ${first.id}` })).toBeInTheDocument();
  expect(within(rows[1]).getByText('Chờ xác nhận')).toBeInTheDocument();
  expect(within(rows[1]).getByText(/66\.000/)).toBeInTheDocument();
});
it('rỗng → "Bạn chưa có đơn nào"', async () => {
  await signUp('a@x.vn');
  renderOrders();
  expect(await screen.findByText('Bạn chưa có đơn nào')).toBeInTheDocument();
});
it('lỗi tải → ErrorState; Thử lại tải lại được', async () => {
  await signUp('a@x.vn');
  const order = await adapter.createOrder(orderRequest());
  const spy = vi.spyOn(adapter, 'getMyOrders').mockRejectedValue(new ApiError(500, 'Máy chủ trả lỗi 500'));
  renderOrders();
  expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent('Máy chủ trả lỗi 500');
  spy.mockRestore();
  await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByRole('link', { name: `Đơn ${order.id}` })).toBeInTheDocument();
});
it('đăng xuất rồi đăng nhập người khác: không thấy đơn của người trước', async () => {
  await signUp('a@x.vn');
  const mine = await adapter.createOrder(orderRequest());
  await adapter.register({ name: 'Other', email: 'b@x.vn', password: 'matkhau123' });
  renderOrders();
  expect(await screen.findByRole('link', { name: `Đơn ${mine.id}` })).toBeInTheDocument();
  await act(() => auth.logout());
  expect(await screen.findByRole('link', { name: 'QUAY LẠI LỊCH SỬ' })).toBeInTheDocument(); // đã bị đưa về /login
  await act(() => auth.login({ email: 'b@x.vn', password: 'matkhau123' }));
  await userEvent.click(await screen.findByRole('link', { name: 'QUAY LẠI LỊCH SỬ' }));
  expect(await screen.findByText('Bạn chưa có đơn nào')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: `Đơn ${mine.id}` })).toBeNull();
});
