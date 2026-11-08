import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { adapter } from '../../api';
import App from '../../App';
import { renderWithProviders } from '../../test/renderWithProviders';
import { signInStaff } from '../../test/staffTestUtils';

vi.mock('../../api', async () => (await import('../../test/mockApi')).mockApiModule());

let rid = 0;
const placeOrder = () => adapter.createOrder({
  client_request_id: `o-${(rid += 1)}`,
  customer: { name: 'Nguyễn An', phone: '0901234567' },
  address: { province_id: 'hn', ward_id: 'hn-1', street: '12 Lê Lợi' },
  note: 'gọi trước khi giao', payment_method: 'cash',
  items: [{ product_id: 'tra-dao', size_id: 'm', topping_ids: [], note: '', quantity: 2 }],
});
const tab = (name) => screen.getByRole('tab', { name: new RegExp(`^${name}`) });
const card = (id) => screen.findByRole('article', { name: `Đơn ${id}` });

async function openPage() {
  await signInStaff();
  renderWithProviders(<App />, { route: '/staff/orders' });
  await screen.findByRole('heading', { name: 'Đơn online' });
}

beforeEach(() => localStorage.clear());

it('không có đơn → thông báo trống', async () => {
  await openPage();
  expect(await screen.findByText('Không có đơn nào')).toBeInTheDocument();
});
it('thẻ đơn hiện thông tin khách; tab có số đếm', async () => {
  const { id } = await placeOrder();
  await openPage();
  const article = await card(id);
  expect(article).toHaveTextContent('Nguyễn An');
  expect(article).toHaveTextContent('0901234567');
  expect(article).toHaveTextContent('12 Lê Lợi');
  expect(article).toHaveTextContent('gọi trước khi giao');
  expect(article).toHaveTextContent('Trà đào cam sả');
  expect(tab('Chờ xác nhận')).toHaveTextContent('1');
});
it('chuyển lần lượt các bước; đơn đang giao không có nút huỷ', async () => {
  const { id } = await placeOrder();
  await openPage();
  await userEvent.click(within(await card(id)).getByRole('button', { name: 'Nhận đơn → pha chế' }));
  await userEvent.click(tab('Đang pha chế'));
  await userEvent.click(within(await card(id)).getByRole('button', { name: 'Giao hàng' }));
  await userEvent.click(tab('Đang giao'));
  const delivering = await card(id);
  expect(within(delivering).queryByRole('button', { name: 'Huỷ đơn' })).not.toBeInTheDocument();
  await userEvent.click(within(delivering).getByRole('button', { name: 'Đã giao' }));
  await userEvent.click(tab('Đã xong'));
  expect(await card(id)).toHaveTextContent('Đã giao');
  expect((await adapter.getOrder(id, '0901234567')).status).toBe('delivered');
});
it('huỷ đơn có xác nhận; bấm Không thì giữ nguyên', async () => {
  const { id } = await placeOrder();
  await openPage();
  await userEvent.click(within(await card(id)).getByRole('button', { name: 'Huỷ đơn' }));
  await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Không' }));
  expect((await adapter.getOrder(id, '0901234567')).status).toBe('placed');
  await userEvent.click(within(await card(id)).getByRole('button', { name: 'Huỷ đơn' }));
  await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Huỷ đơn' }));
  await userEvent.click(tab('Đã xong'));
  expect(await card(id)).toHaveTextContent('Đã hủy');
});
it('người khác đã đổi trước → 409, báo tại thẻ và tải lại', async () => {
  const { id } = await placeOrder();
  await openPage();
  const article = await card(id);
  await adapter.staffUpdateOrderStatus(id, 'cancelled');
  await userEvent.click(within(article).getByRole('button', { name: 'Nhận đơn → pha chế' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Đơn đã được cập nhật bởi người khác');
  await userEvent.click(tab('Đã xong'));
  expect(await card(id)).toHaveTextContent('Đã hủy');
});

it('bấm hai đơn liên tiếp: đơn đầu vẫn bị khoá trong lúc gửi và lỗi của nó vẫn hiện', async () => {
  const x = await placeOrder();
  const y = await placeOrder();
  await openPage();
  const real = adapter.staffUpdateOrderStatus.bind(adapter);
  let rejectX;
  vi.spyOn(adapter, 'staffUpdateOrderStatus')
    .mockImplementationOnce(() => new Promise((_, reject) => { rejectX = () => reject(Object.assign(new Error('Xung đột'), { status: 409 })); }))
    .mockImplementation(real);
  const cardX = await card(x.id);
  await userEvent.click(within(cardX).getByRole('button', { name: 'Nhận đơn → pha chế' }));
  await userEvent.click(within(await card(y.id)).getByRole('button', { name: 'Nhận đơn → pha chế' }));
  expect(within(cardX).getByRole('button', { name: 'Nhận đơn → pha chế' })).toBeDisabled();
  rejectX();
  expect(await within(await card(x.id)).findByRole('alert')).toHaveTextContent('Đơn đã được cập nhật bởi người khác');
  vi.restoreAllMocks();
});
