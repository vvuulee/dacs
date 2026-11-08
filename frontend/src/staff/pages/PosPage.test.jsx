import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { MOCK_ORDERS_KEY } from '../../constants';
import { setAvailability } from '../../mocks/availabilityStore';
import { renderWithProviders } from '../../test/renderWithProviders';
import { signInStaff } from '../../test/staffTestUtils';

vi.mock('../../api', async () => (await import('../../test/mockApi')).mockApiModule());

const money = (text) => new RegExp(text.replace('.', '\\.').replace(' ₫', '\\s₫'));
const cart = () => screen.getByRole('region', { name: 'Đơn hiện tại' });
const total = () => within(cart()).getByTestId('pos-total');
const storedOrders = () => JSON.parse(localStorage.getItem(MOCK_ORDERS_KEY) ?? '[]');

async function openPos() {
  await signInStaff();
  renderWithProviders(<App />, { route: '/staff' });
  await screen.findByRole('heading', { name: 'Bán hàng' });
  await screen.findByRole('button', { name: /Bạc xỉu/ });
}
async function addBacXiu() {
  await userEvent.click(screen.getByRole('button', { name: /Bạc xỉu/ }));
  const dialog = await screen.findByRole('dialog', { name: 'Bạc xỉu' });
  await userEvent.click(within(dialog).getByRole('button', { name: /thêm vào đơn/i }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Bạc xỉu' })).not.toBeInTheDocument());
}

beforeEach(() => localStorage.clear());

it('món hết hàng bị khoá', async () => {
  await openPos();
  expect(screen.getByRole('button', { name: /Cold brew cam sả/ })).toBeDisabled();
});
it('lọc theo danh mục và tìm không dấu', async () => {
  await openPos();
  await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm món' }), 'bac xiu');
  expect(screen.getByRole('button', { name: /Bạc xỉu/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Trà đào/ })).not.toBeInTheDocument();
});
it('thêm món, tăng số lượng, thành tiền cập nhật', async () => {
  await openPos();
  await addBacXiu();
  expect(within(cart()).getByText('Bạc xỉu')).toBeInTheDocument();
  expect(total()).toHaveTextContent(money('29.000 ₫'));
  await userEvent.click(within(cart()).getByRole('button', { name: 'Tăng số lượng Bạc xỉu' }));
  expect(total()).toHaveTextContent(money('58.000 ₫'));
});
it('tại bàn mà chưa nhập số bàn → báo lỗi, không mở thanh toán', async () => {
  await openPos();
  await addBacXiu();
  await userEvent.click(screen.getByRole('button', { name: 'Thanh toán' }));
  expect(screen.getByLabelText('Số bàn')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.queryByRole('dialog', { name: 'Thanh toán' })).not.toBeInTheDocument();
});
it('tiền mặt: thiếu tiền thì khoá; gợi ý 100.000 → tiền thối; xác nhận → hoá đơn; in; đơn mới', async () => {
  const print = vi.spyOn(window, 'print').mockImplementation(() => {});
  await openPos();
  await addBacXiu();
  await userEvent.click(within(cart()).getByRole('button', { name: 'Tăng số lượng Bạc xỉu' }));
  await userEvent.type(screen.getByLabelText('Số bàn'), '5');
  await userEvent.click(screen.getByRole('button', { name: 'Thanh toán' }));
  const dialog = await screen.findByRole('dialog', { name: 'Thanh toán' });
  await userEvent.type(within(dialog).getByLabelText('Khách đưa'), '50.000');
  expect(within(dialog).getByRole('button', { name: 'Xác nhận' })).toBeDisabled();
  await userEvent.clear(within(dialog).getByLabelText('Khách đưa'));
  await userEvent.type(within(dialog).getByLabelText('Khách đưa'), 'abc');
  expect(within(dialog).getByRole('button', { name: 'Xác nhận' })).toBeDisabled();
  await userEvent.click(within(dialog).getByRole('button', { name: money('100.000 ₫') }));
  expect(within(dialog).getByTestId('change')).toHaveTextContent(money('42.000 ₫'));
  await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }));
  const receipt = await screen.findByRole('region', { name: 'Hoá đơn' });
  expect(receipt).toHaveTextContent(/CF\d{8}/);
  expect(receipt).toHaveTextContent('Bàn 5');
  expect(receipt).toHaveTextContent(money('100.000 ₫'));
  expect(receipt).toHaveTextContent(money('42.000 ₫'));
  expect(storedOrders()[0]).toMatchObject({ source: 'counter', table: '5', cash_received: 100000 });
  await userEvent.click(screen.getByRole('button', { name: 'In hoá đơn' }));
  expect(print).toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Đơn mới' }));
  expect(within(cart()).getByText('Chưa có món nào')).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Tại bàn' })).toBeChecked();
  expect(screen.getByLabelText('Số bàn')).toHaveValue('');
  print.mockRestore();
});
it('xoá hết: hỏi xác nhận, bấm Không thì giỏ còn nguyên', async () => {
  await openPos();
  await addBacXiu();
  await userEvent.click(screen.getByRole('button', { name: 'Xoá hết' }));
  await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Không' }));
  expect(within(cart()).getByText('Bạc xỉu')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Xoá hết' }));
  await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Xoá hết' }));
  expect(within(cart()).getByText('Chưa có món nào')).toBeInTheDocument();
});
it('món bị tắt sau khi vào giỏ → lỗi trong hộp thanh toán, giỏ giữ nguyên', async () => {
  await openPos();
  await addBacXiu();
  await userEvent.click(screen.getByRole('radio', { name: 'Mang đi' }));
  setAvailability('bac-xiu', false);
  await userEvent.click(screen.getByRole('button', { name: 'Thanh toán' }));
  const dialog = await screen.findByRole('dialog', { name: 'Thanh toán' });
  await userEvent.click(within(dialog).getByRole('button', { name: money('29.000 ₫') }));
  await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Món Bạc xỉu đã hết');
  expect(within(cart()).getByText('Bạc xỉu')).toBeInTheDocument();
});
it('chuyển khoản: hiện QR, bấm "Đã nhận chuyển khoản" thì tạo đơn chuyển khoản', async () => {
  await openPos();
  await addBacXiu();
  await userEvent.click(screen.getByRole('radio', { name: 'Mang đi' }));
  await userEvent.click(screen.getByRole('button', { name: 'Thanh toán' }));
  const dialog = await screen.findByRole('dialog', { name: 'Thanh toán' });
  await userEvent.click(within(dialog).getByRole('radio', { name: 'Chuyển khoản' }));
  expect(within(dialog).getByRole('img', { name: 'Mã QR mẫu' })).toBeInTheDocument();
  await userEvent.click(within(dialog).getByRole('button', { name: 'Đã nhận chuyển khoản' }));
  expect(await screen.findByRole('region', { name: 'Hoá đơn' })).toHaveTextContent('Mang đi');
  expect(storedOrders()[0]).toMatchObject({ payment_method: 'bank_transfer', service_type: 'takeaway', table: null });
});
it('áp voucher tại quầy: dòng giảm giá; FREESHIP bị từ chối', async () => {
  await openPos();
  await addBacXiu();
  for (let i = 0; i < 3; i += 1) await userEvent.click(within(cart()).getByRole('button', { name: 'Tăng số lượng Bạc xỉu' }));
  await userEvent.type(screen.getByLabelText('Mã giảm giá'), 'FREESHIP');
  await userEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
  expect(await screen.findByText('Mã chỉ áp dụng cho đơn giao hàng')).toBeInTheDocument();
  await userEvent.clear(screen.getByLabelText('Mã giảm giá'));
  await userEvent.type(screen.getByLabelText('Mã giảm giá'), 'GIAM20K');
  await userEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
  expect(await within(cart()).findByText(/Đã áp dụng GIAM20K/)).toBeInTheDocument();
  expect(total()).toHaveTextContent(money('96.000 ₫'));
});
