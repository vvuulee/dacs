import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { adapter } from '../../api';
import App from '../../App';
import { renderWithProviders } from '../../test/renderWithProviders';
import { signInStaff } from '../../test/staffTestUtils';

vi.mock('../../api', async () => (await import('../../test/mockApi')).mockApiModule());

const row = (code) => screen.getByRole('row', { name: new RegExp(code) });
async function openPage() {
  await signInStaff();
  renderWithProviders(<App />, { route: '/staff/vouchers' });
  await screen.findByRole('row', { name: /CHAO10/ });
}
async function openForm() {
  await userEvent.click(screen.getByRole('button', { name: 'Tạo voucher' }));
  return screen.findByRole('form', { name: 'Tạo voucher' });
}
async function fillValid(form, code = 'TET-2027') {
  await userEvent.type(within(form).getByLabelText('Mã'), code);
  await userEvent.type(within(form).getByLabelText('Tiêu đề'), 'Giảm Tết');
  await userEvent.type(within(form).getByLabelText('Giá trị (%)'), '10');
  await userEvent.type(within(form).getByLabelText('Hạn dùng'), '2099-01-31');
}

beforeEach(() => localStorage.clear());

it('bảng hiện loại/giá trị và trạng thái hạn', async () => {
  await openPage();
  expect(row('CHAO10')).toHaveTextContent(/10% tối đa 30\.000\s₫/);
  expect(row('FREESHIP')).toHaveTextContent('Miễn phí giao');
  expect(row('HETHAN')).toHaveTextContent('Hết hạn');
  expect(row('CHAO10')).toHaveTextContent('Còn hạn');
});
it('tạo voucher hợp lệ → dòng mới; khách dùng được', async () => {
  await openPage();
  const form = await openForm();
  await fillValid(form);
  await userEvent.click(within(form).getByRole('button', { name: 'Lưu voucher' }));
  expect(await screen.findByRole('row', { name: /TET-2027/ })).toHaveTextContent('Giảm Tết');
  const items = [{ product_id: 'bac-xiu', size_id: 's', topping_ids: [], quantity: 1 }];
  expect((await adapter.validateVoucher({ code: 'TET-2027', items })).valid).toBe(true);
});
it('trùng mã → "Mã đã tồn tại" dưới ô mã', async () => {
  await openPage();
  const form = await openForm();
  await fillValid(form, 'chao10');
  await userEvent.click(within(form).getByRole('button', { name: 'Lưu voucher' }));
  expect(await within(form).findByText('Mã đã tồn tại')).toBeInTheDocument();
  expect(within(form).getByLabelText('Mã')).toHaveAttribute('aria-invalid', 'true');
});
it('form báo lỗi tại chỗ và không gửi khi sai', async () => {
  await openPage();
  const form = await openForm();
  await userEvent.click(within(form).getByRole('button', { name: 'Lưu voucher' }));
  expect(within(form).getByLabelText('Mã')).toHaveAttribute('aria-invalid', 'true');
  expect(within(form).getByLabelText('Mã')).toHaveFocus();
});
it('loại freeship ẩn ô giá trị; loại số tiền ẩn ô giảm tối đa', async () => {
  await openPage();
  const form = await openForm();
  expect(within(form).getByLabelText('Giảm tối đa (₫)')).toBeInTheDocument();
  await userEvent.selectOptions(within(form).getByLabelText('Loại'), 'freeship');
  expect(within(form).queryByLabelText(/Giá trị/)).not.toBeInTheDocument();
  await userEvent.selectOptions(within(form).getByLabelText('Loại'), 'fixed');
  expect(within(form).getByLabelText('Giá trị (₫)')).toBeInTheDocument();
  expect(within(form).queryByLabelText('Giảm tối đa (₫)')).not.toBeInTheDocument();
});
it('xoá có xác nhận đúng câu chữ → dòng biến mất', async () => {
  await openPage();
  await userEvent.click(within(row('CHAO10')).getByRole('button', { name: 'Xoá CHAO10' }));
  const dialog = screen.getByRole('alertdialog', { name: 'Xoá mã CHAO10?' });
  expect(dialog).toHaveTextContent('Khách sẽ không dùng được mã này nữa. Đơn đã đặt không bị ảnh hưởng.');
  expect(within(dialog).getByRole('button', { name: 'Không' })).toHaveFocus();
  await userEvent.click(within(dialog).getByRole('button', { name: 'Xoá' }));
  await screen.findByRole('row', { name: /GIAM20K/ });
  await vi.waitFor(() => expect(screen.queryByRole('row', { name: /CHAO10/ })).not.toBeInTheDocument());
});
