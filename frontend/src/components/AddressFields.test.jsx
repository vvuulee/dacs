import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { adapter } from '../api';
import { ApiError } from '../api/client';
import { renderWithProviders } from '../test/renderWithProviders';
import AddressFields from './AddressFields';

vi.mock('../api', async () => {
  const { createMockAdapter } = await import('../api/adapters/mockAdapter');
  return { adapter: createMockAdapter(0) };
});

function Harness({ errors, spy }) {
  const [value, setValue] = useState({ provinceId: '', wardId: '', street: '' });
  const onChange = (patch) => { spy?.(patch); setValue((v) => ({ ...v, ...patch })); };
  return <AddressFields value={value} errors={errors} onChange={onChange} />;
}
afterEach(() => vi.restoreAllMocks());

it('phường bị khóa tới khi chọn tỉnh', () => {
  renderWithProviders(<Harness />);
  expect(screen.getByLabelText('Phường/Xã')).toBeDisabled();
});
it('chọn Hà Nội → 4 phường "Phường Mẫu 1..4"', async () => {
  renderWithProviders(<Harness />);
  await screen.findByRole('option', { name: 'Hà Nội' });
  await userEvent.selectOptions(screen.getByLabelText('Tỉnh/Thành'), 'hn');
  expect(await screen.findByRole('option', { name: 'Phường Mẫu 4' })).toBeInTheDocument();
  expect(screen.getByLabelText('Phường/Xã')).toBeEnabled();
});
it('đổi tỉnh gọi onChange({ provinceId: "hcm", wardId: "" })', async () => {
  const spy = vi.fn();
  renderWithProviders(<Harness spy={spy} />);
  await screen.findByRole('option', { name: 'Hà Nội' });
  await userEvent.selectOptions(screen.getByLabelText('Tỉnh/Thành'), 'hn');
  await screen.findByRole('option', { name: 'Phường Mẫu 1' });
  await userEvent.selectOptions(screen.getByLabelText('Phường/Xã'), 'hn-1');
  await userEvent.selectOptions(screen.getByLabelText('Tỉnh/Thành'), 'hcm');
  expect(spy).toHaveBeenLastCalledWith({ provinceId: 'hcm', wardId: '' });
  expect(screen.getByLabelText('Phường/Xã')).toHaveValue('');
});
it('gõ số nhà và tên đường cập nhật ô', async () => {
  renderWithProviders(<Harness />);
  await userEvent.type(screen.getByLabelText('Số nhà, tên đường'), '12 Lê Lợi');
  expect(screen.getByLabelText('Số nhà, tên đường')).toHaveValue('12 Lê Lợi');
});
it('có lỗi → aria-invalid, aria-describedby và thông điệp hiện ra', () => {
  renderWithProviders(<Harness errors={{ provinceId: 'Chọn tỉnh/thành' }} />);
  const select = screen.getByLabelText('Tỉnh/Thành');
  expect(select).toHaveAttribute('aria-invalid', 'true');
  expect(select).toHaveAccessibleDescription('Chọn tỉnh/thành');
});
it('lỗi tải tỉnh hiện ErrorState; Thử lại tải lại được', async () => {
  const spy = vi.spyOn(adapter, 'getProvinces').mockRejectedValue(new ApiError(500, 'Máy chủ trả lỗi 500'));
  renderWithProviders(<Harness />);
  expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent('Máy chủ trả lỗi 500');
  spy.mockRestore();
  await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByRole('option', { name: 'Đà Nẵng' })).toBeInTheDocument();
});
