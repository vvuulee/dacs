import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { adapter } from '../../api';
import App from '../../App';
import { renderWithProviders } from '../../test/renderWithProviders';
import { signInStaff } from '../../test/staffTestUtils';

vi.mock('../../api', async () => (await import('../../test/mockApi')).mockApiModule());

const tile = (name) => screen.getByRole('group', { name });
async function seed() {
  await adapter.createOrder({
    client_request_id: 'o-1', customer: { name: 'Nguyễn An', phone: '0901234567' },
    address: { province_id: 'hn', ward_id: 'hn-1', street: '12 Lê Lợi' }, note: '', payment_method: 'cash',
    items: [{ product_id: 'tra-dao', size_id: 'm', topping_ids: ['thach'], note: '', quantity: 2 }],
  });
  return adapter.staffCreateOrder({
    client_request_id: 'c-1', service_type: 'dine_in', table: '7', payment_method: 'cash', cash_received: 100000,
    items: [{ product_id: 'bac-xiu', size_id: 's', topping_ids: [], note: '', quantity: 2 }],
  });
}
async function openPage() {
  renderWithProviders(<App />, { route: '/staff/history' });
  await screen.findByRole('heading', { name: /^Hôm nay, / });
}

beforeEach(async () => { localStorage.clear(); await signInStaff(); });

it('tiêu đề có ngày hôm nay, không có ô chọn ngày', async () => {
  await openPage();
  expect(screen.getByRole('heading', { name: `Hôm nay, ${new Date().toLocaleDateString('vi-VN')}` })).toBeInTheDocument();
  expect(document.querySelector('input[type="date"]')).toBeNull();
});
it('chưa có đơn → thông báo trống', async () => {
  await openPage();
  expect(await screen.findByText('Hôm nay chưa có đơn nào')).toBeInTheDocument();
});
it('thẻ số liệu và bảng đơn', async () => {
  await seed();
  await openPage();
  expect(await screen.findByRole('group', { name: 'Số đơn' })).toHaveTextContent('2');
  expect(tile('Doanh thu')).toHaveTextContent(/187\.000\s₫/);
  expect(tile('Đơn huỷ')).toHaveTextContent('0');
  expect(tile('Quầy / Online')).toHaveTextContent(/Quầy\s*1/);
  expect(tile('Quầy / Online')).toHaveTextContent(/Online\s*1/);
  expect(screen.getByTestId('by-payment')).toHaveTextContent(/Tiền mặt\s*187\.000\s₫/);
  expect(screen.getAllByRole('row')).toHaveLength(3);
  expect(screen.getByRole('row', { name: /Bàn 7/ })).toHaveTextContent('Quầy');
  expect(screen.getByRole('row', { name: /Nguyễn An/ })).toHaveTextContent('Online');
});
it('bấm đơn quầy → chi tiết có nút in lại hoá đơn', async () => {
  const print = vi.spyOn(window, 'print').mockImplementation(() => {});
  const counter = await seed();
  await openPage();
  await userEvent.click(await screen.findByRole('button', { name: `Xem đơn ${counter.id}` }));
  const receipt = screen.getByRole('region', { name: 'Hoá đơn' });
  expect(receipt).toHaveTextContent('Bàn 7');
  await userEvent.click(screen.getByRole('button', { name: 'In lại hoá đơn' }));
  expect(print).toHaveBeenCalled();
  print.mockRestore();
});
it('bấm đơn online → chi tiết chỉ xem, không có nút in', async () => {
  await seed();
  await openPage();
  const online = (await adapter.staffGetTodayOrders()).find((o) => o.source === 'online');
  await userEvent.click(await screen.findByRole('button', { name: `Xem đơn ${online.id}` }));
  const detail = screen.getByRole('region', { name: `Chi tiết đơn ${online.id}` });
  expect(within(detail).getByText(/12 Lê Lợi/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'In lại hoá đơn' })).not.toBeInTheDocument();
});
