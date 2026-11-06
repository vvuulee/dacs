import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { adapter } from '../api';
import { ORDER_NOT_FOUND_TEXT } from '../features/orders/orderStatus';
import { addRecentOrder } from '../features/orders/recentOrders';
import { LocationDisplay, renderWithProviders } from '../test/renderWithProviders';
import OrdersPage from './OrdersPage';

vi.mock('../api', async () => {
  const { createMockAdapter } = await import('../api/adapters/mockAdapter');
  return { adapter: createMockAdapter(0) };
});

const PHONE = '0901234567';
const placeOrder = () => adapter.createOrder({
  client_request_id: `rid-${Math.random()}`, customer: { name: 'Nguyễn An', phone: PHONE },
  address: { province_id: 'hn', ward_id: 'hn-1', street: '12 Lê Lợi' }, note: '', payment_method: 'cash',
  items: [{ product_id: 'tra-dao', size_id: 'm', topping_ids: [], note: '', quantity: 1 }],
});
const renderOrders = () =>
  renderWithProviders(
    <>
      <Routes><Route path="/orders" element={<OrdersPage />} /><Route path="/orders/:id" element={<div>TRANG THEO DÕI</div>} /></Routes>
      <LocationDisplay />
    </>,
    { route: '/orders' },
  );
const lookup = async (id, phone) => {
  await userEvent.clear(screen.getByLabelText('Mã đơn'));
  await userEvent.type(screen.getByLabelText('Mã đơn'), id);
  await userEvent.clear(screen.getByLabelText('Số điện thoại'));
  await userEvent.type(screen.getByLabelText('Số điện thoại'), phone);
  await userEvent.click(screen.getByRole('button', { name: 'Tra cứu' }));
};

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

it('tra đúng mã + "+84 901 234 567" → chuyển /orders/<id> và nhớ đơn', async () => {
  const { id } = await placeOrder();
  renderOrders();
  await lookup(id, '+84 901 234 567');
  expect(await screen.findByText('TRANG THEO DÕI')).toBeInTheDocument();
  expect(screen.getByTestId('location')).toHaveTextContent(`/orders/${id}`);
  expect(JSON.parse(localStorage.getItem('coffee-web:recent-orders')).items[0]).toMatchObject({ id, phone: PHONE });
});
it('sai SĐT và sai mã cho cùng một thông báo', async () => {
  const { id } = await placeOrder();
  renderOrders();
  await lookup(id, '0911111111');
  const wrongPhone = (await screen.findByRole('alert')).textContent;
  await lookup('CF99999999', PHONE);
  await screen.findByText(ORDER_NOT_FOUND_TEXT);
  expect(screen.getByRole('alert').textContent).toBe(wrongPhone);
  expect(wrongPhone).toBe(ORDER_NOT_FOUND_TEXT);
});
it('SĐT sai định dạng báo lỗi và không gọi getOrder', async () => {
  const spy = vi.spyOn(adapter, 'getOrder');
  renderOrders();
  await lookup('CF00000001', '123');
  expect(screen.getByText(/Số điện thoại không hợp lệ/)).toBeInTheDocument();
  expect(spy).not.toHaveBeenCalled();
});
it('thiếu mã đơn báo lỗi và không gọi getOrder', async () => {
  const spy = vi.spyOn(adapter, 'getOrder');
  renderOrders();
  await lookup(' ', PHONE);
  expect(screen.getByText('Nhập mã đơn')).toBeInTheDocument();
  expect(spy).not.toHaveBeenCalled();
});
it('danh sách đơn gần đây có link /orders/<id>; rỗng thì có thông báo', async () => {
  renderOrders();
  expect(screen.getByText('Chưa có đơn gần đây')).toBeInTheDocument();
  addRecentOrder({ id: 'CF00000007', phone: PHONE, createdAt: '2026-10-30T03:00:00.000Z' });
  renderOrders();
  expect(screen.getByRole('link', { name: /CF00000007/ })).toHaveAttribute('href', '/orders/CF00000007');
});
