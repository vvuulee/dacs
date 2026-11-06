import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { adapter } from '../api';
import { ApiError } from '../api/client';
import { VOUCHER_CART_CHANGED_TEXT, VOUCHER_FORMAT_TEXT } from '../features/vouchers/messages';
import { renderWithProviders } from '../test/renderWithProviders';
import VoucherBox from './VoucherBox';

vi.mock('../api', async () => {
  const { createMockAdapter } = await import('../api/adapters/mockAdapter');
  return { adapter: createMockAdapter(0) };
});

// 2 × (45.000 + 6.000) = 102.000
const items = [{ key: 'k', productId: 'tra-dao', name: 'Trà đào', image: '', sizeId: 'm', toppingIds: [], note: '', quantity: 2, unitPrice: 51000, summary: '' }];
const chao10 = { code: 'CHAO10', title: 'Giảm 10% (tối đa 30.000 ₫)', discount: 10200 };
let onApplied;
let onRemove;
const renderBox = (props = {}) => {
  onApplied = vi.fn();
  onRemove = vi.fn();
  return renderWithProviders(<VoucherBox items={items} applied={null} cartChanged={false} onApplied={onApplied} onRemove={onRemove} {...props} />);
};
async function apply(code) {
  const input = screen.getByLabelText('Mã giảm giá');
  await userEvent.clear(input);
  await userEvent.type(input, code);
  await userEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

it('nhập " chao10 " và Áp dụng → onApplied nhận kết quả hợp lệ, ô nhập được xóa', async () => {
  renderBox();
  await apply(' chao10 ');
  await vi.waitFor(() => expect(onApplied).toHaveBeenCalledOnce());
  expect(onApplied.mock.calls[0][0]).toMatchObject({ valid: true, code: 'CHAO10', discount: 10200 });
  expect(screen.getByLabelText('Mã giảm giá')).toHaveValue('');
});
it('mã sai định dạng "ab" → VOUCHER_FORMAT_TEXT và không gọi adapter.validateVoucher', async () => {
  const spy = vi.spyOn(adapter, 'validateVoucher');
  renderBox();
  await apply('ab');
  expect(screen.getByRole('alert')).toHaveTextContent(VOUCHER_FORMAT_TEXT);
  expect(spy).not.toHaveBeenCalled();
});
it('HETHAN → hiện "Mã giảm giá đã hết hạn", onApplied không được gọi', async () => {
  renderBox();
  await apply('HETHAN');
  expect(await screen.findByRole('alert')).toHaveTextContent('Mã giảm giá đã hết hạn');
  expect(screen.getByLabelText('Mã giảm giá')).toHaveAttribute('aria-invalid', 'true');
  expect(onApplied).not.toHaveBeenCalled();
});
it('dưới đơn tối thiểu → hiện lý do "Đơn hàng cần từ ..."', async () => {
  renderBox({ items: [{ ...items[0], sizeId: 's', quantity: 1 }] });
  await apply('GIAM20K');
  expect((await screen.findByRole('alert')).textContent.replace(/\s/g, ' ')).toBe('Đơn hàng cần từ 100.000 ₫ để dùng mã này');
});
it('đang có mã áp, áp mã sai → lý do hiện dưới ô, mã cũ và nút Bỏ mã còn nguyên, onApplied/onRemove không gọi', async () => {
  renderBox({ applied: chao10 });
  await apply('HETHAN');
  expect(await screen.findByRole('alert')).toHaveTextContent('Mã giảm giá đã hết hạn');
  expect(screen.getByText(/Đã áp dụng CHAO10/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Bỏ mã' })).toBeInTheDocument();
  expect(onApplied).not.toHaveBeenCalled();
  expect(onRemove).not.toHaveBeenCalled();
});
it('đang có mã áp, áp mã mới thành công → onApplied nhận mã mới', async () => {
  renderBox({ applied: chao10 });
  await apply('GIAM20K');
  await vi.waitFor(() => expect(onApplied).toHaveBeenCalledOnce());
  expect(onApplied.mock.calls[0][0]).toMatchObject({ code: 'GIAM20K', discount: 20000 });
});
it('bấm Áp dụng hai lần liên tiếp chỉ gọi validateVoucher một lần', async () => {
  const spy = vi.spyOn(adapter, 'validateVoucher');
  renderBox();
  await userEvent.type(screen.getByLabelText('Mã giảm giá'), 'CHAO10');
  await userEvent.dblClick(screen.getByRole('button', { name: 'Áp dụng' }));
  await vi.waitFor(() => expect(onApplied).toHaveBeenCalled());
  expect(spy).toHaveBeenCalledTimes(1);
});
it('lỗi máy chủ → hiện message lỗi và bấm lại được', async () => {
  const spy = vi.spyOn(adapter, 'validateVoucher').mockRejectedValueOnce(new ApiError(500, 'Máy chủ trả lỗi 500'));
  renderBox();
  await apply('CHAO10');
  expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ trả lỗi 500');
  await userEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
  await vi.waitFor(() => expect(onApplied).toHaveBeenCalledOnce());
  expect(spy).toHaveBeenCalledTimes(2);
});
it('applied → hiện "Đã áp dụng CHAO10 — <tiêu đề>"; Bỏ mã gọi onRemove', async () => {
  renderBox({ applied: chao10 });
  expect(screen.getByText('Đã áp dụng CHAO10 — Giảm 10% (tối đa 30.000 ₫)')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Bỏ mã' }));
  expect(onRemove).toHaveBeenCalledOnce();
});
it('chưa áp mã thì không có "Đã áp dụng" và không có nút Bỏ mã', () => {
  renderBox();
  expect(screen.queryByText(/Đã áp dụng/)).toBeNull();
  expect(screen.queryByRole('button', { name: 'Bỏ mã' })).toBeNull();
});
it('cartChanged → hiện VOUCHER_CART_CHANGED_TEXT', () => {
  renderBox({ cartChanged: true });
  expect(screen.getByRole('status')).toHaveTextContent(VOUCHER_CART_CHANGED_TEXT);
});
