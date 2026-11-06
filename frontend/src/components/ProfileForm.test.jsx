import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { adapter } from '../api';
import { useAuth } from '../features/auth/AuthContext';
import { clearSession, saveSession } from '../features/auth/session';
import { renderWithProviders } from '../test/renderWithProviders';
import ProfileForm from './ProfileForm';

vi.mock('../api', async () => {
  const { createMockAdapter } = await import('../api/adapters/mockAdapter');
  return { adapter: createMockAdapter(0) };
});

let auth;
function Gate() {
  auth = useAuth();
  return auth.status === 'authenticated' ? <ProfileForm /> : null;
}
const ADDRESS = { province_id: 'hn', ward_id: 'hn-1', street: '12 Lê Lợi' };
async function signUp({ withDetails = false } = {}) {
  const result = await adapter.register({ name: 'An', email: 'an@x.vn', password: 'matkhau123' });
  saveSession({ token: result.token, expiresAt: result.expires_at });
  if (withDetails) await adapter.updateMe({ name: 'An', phone: '0901234567', address: ADDRESS });
}
const save = () => userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

beforeEach(() => { localStorage.clear(); clearSession(); });
afterEach(() => { vi.restoreAllMocks(); clearSession(); });

it('điền sẵn tên, email (chỉ đọc), SĐT và địa chỉ từ hồ sơ', async () => {
  await signUp({ withDetails: true });
  renderWithProviders(<Gate />);
  expect(await screen.findByLabelText('Họ tên')).toHaveValue('An');
  expect(screen.getByLabelText('Email')).toHaveValue('an@x.vn');
  expect(screen.getByLabelText('Email')).toHaveAttribute('readonly');
  expect(screen.getByLabelText('Số điện thoại')).toHaveValue('0901234567');
  expect(screen.getByLabelText('Số nhà, tên đường')).toHaveValue('12 Lê Lợi');
  await waitFor(() => expect(screen.getByLabelText('Tỉnh/Thành')).toHaveValue('hn'));
  await waitFor(() => expect(screen.getByLabelText('Phường/Xã')).toHaveValue('hn-1'));
});
it('lưu hồ sơ hợp lệ: "Đã lưu", AuthContext có tên mới, gọi updateMe đúng dữ liệu', async () => {
  await signUp();
  const spy = vi.spyOn(adapter, 'updateMe');
  renderWithProviders(<Gate />);
  const name = await screen.findByLabelText('Họ tên');
  await userEvent.clear(name);
  await userEvent.type(name, 'An B');
  await save();
  expect(await screen.findByText('Đã lưu')).toBeInTheDocument();
  expect(spy).toHaveBeenCalledWith({ name: 'An B', phone: null, address: null });
  expect(auth.user.name).toBe('An B');
});
it('SĐT "123" → lỗi dưới ô, không gọi updateMe', async () => {
  await signUp();
  const spy = vi.spyOn(adapter, 'updateMe');
  renderWithProviders(<Gate />);
  await userEvent.type(await screen.findByLabelText('Số điện thoại'), '123');
  await save();
  expect(screen.getByText(/Số điện thoại không hợp lệ/)).toBeInTheDocument();
  expect(spy).not.toHaveBeenCalled();
});
it('chỉ chọn tỉnh mà thiếu phường/đường → lỗi hai ô còn lại', async () => {
  await signUp();
  const spy = vi.spyOn(adapter, 'updateMe');
  renderWithProviders(<Gate />);
  await screen.findByLabelText('Họ tên');
  await screen.findByRole('option', { name: 'Hà Nội' });
  await userEvent.selectOptions(screen.getByLabelText('Tỉnh/Thành'), 'hn');
  await save();
  expect(screen.getByText('Chọn phường/xã', { selector: 'p' })).toBeInTheDocument();
  expect(screen.getByText(/Nhập số nhà và tên đường/)).toBeInTheDocument();
  expect(spy).not.toHaveBeenCalled();
});
it('xóa trống cả ba ô địa chỉ rồi lưu → address null', async () => {
  await signUp({ withDetails: true });
  renderWithProviders(<Gate />);
  await waitFor(() => expect(screen.getByLabelText('Tỉnh/Thành')).toHaveValue('hn'));
  await userEvent.selectOptions(screen.getByLabelText('Tỉnh/Thành'), '');
  await userEvent.clear(screen.getByLabelText('Số nhà, tên đường'));
  await save();
  expect(await screen.findByText('Đã lưu')).toBeInTheDocument();
  expect((await adapter.getMe()).address).toBeNull();
});
it('sửa lại sau khi lưu thì thông báo "Đã lưu" biến mất', async () => {
  await signUp();
  renderWithProviders(<Gate />);
  await userEvent.type(await screen.findByLabelText('Số điện thoại'), '0901234567');
  await save();
  await screen.findByText('Đã lưu');
  await userEvent.type(screen.getByLabelText('Họ tên'), 'x');
  expect(screen.queryByText('Đã lưu')).toBeNull();
});
