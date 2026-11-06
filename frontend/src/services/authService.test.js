import { adapter } from '../api';
import {
  changePassword, forgotPassword, getMe, getMyOrders, login, logout, peekResetToken, register, resetPassword, updateProfile,
} from './authService';

vi.mock('../api', () => ({
  adapter: {
    register: vi.fn(), login: vi.fn(), logout: vi.fn(), getMe: vi.fn(), updateMe: vi.fn(), changePassword: vi.fn(),
    forgotPassword: vi.fn(), resetPassword: vi.fn(), getMyOrders: vi.fn(), peekResetToken: vi.fn(),
  },
}));

const rawUser = { id: 1, name: 'An', email: 'a@x.vn', phone: null, address: null };
const rawAuth = { token: 'tk', expires_at: '2026-11-01T00:00:00.000Z', user: rawUser };
const rawOrder = (id) => ({
  id, status: 'placed', payment_method: 'cash', payment_status: 'unpaid',
  customer: { name: 'An', phone: '0901234567' }, address: { province_name: 'Hà Nội', ward_name: 'P1', street: '12 Lê Lợi' },
  items: [{ product_id: 'a', name: 'A', quantity: 1, unit_price: 1000 }],
  subtotal: 1000, delivery_fee: 15000, total: 16000, created_at: '2026-10-30T03:00:00.000Z', payment: null,
});
beforeEach(() => vi.clearAllMocks());

it('register trả AuthResult đã map; email được cắt khoảng trắng', async () => {
  adapter.register.mockResolvedValue(rawAuth);
  expect(await register({ name: 'An', email: ' a@x.vn ', password: 'matkhau123' })).toMatchObject({ token: 'tk', user: { id: '1' } });
  expect(adapter.register).toHaveBeenCalledWith({ name: 'An', email: 'a@x.vn', password: 'matkhau123' });
});
it('login giữ nguyên mật khẩu (kể cả khoảng trắng đầu/cuối)', async () => {
  adapter.login.mockResolvedValue(rawAuth);
  await login({ email: 'a@x.vn', password: ' mat khau ' });
  expect(adapter.login).toHaveBeenCalledWith({ email: 'a@x.vn', password: ' mat khau ' });
});
it('getMe map người dùng; logout gọi adapter', async () => {
  adapter.getMe.mockResolvedValue(rawUser);
  expect(await getMe()).toMatchObject({ id: '1', phone: '' });
  await logout();
  expect(adapter.logout).toHaveBeenCalledOnce();
});
it('updateProfile gửi toProfileRequest và trả User', async () => {
  adapter.updateMe.mockResolvedValue({ ...rawUser, name: 'An B' });
  const user = await updateProfile({ name: ' An B ', phone: '', provinceId: '', wardId: '', street: '' });
  expect(adapter.updateMe).toHaveBeenCalledWith({ name: 'An B', phone: null, address: null });
  expect(user.name).toBe('An B');
});
it('changePassword gửi current_password/new_password', async () => {
  await changePassword({ currentPassword: 'cu', newPassword: 'moi' });
  expect(adapter.changePassword).toHaveBeenCalledWith({ current_password: 'cu', new_password: 'moi' });
});
it('forgotPassword cắt email; resetPassword gửi new_password', async () => {
  await forgotPassword(' a@x.vn ');
  expect(adapter.forgotPassword).toHaveBeenCalledWith({ email: 'a@x.vn' });
  await resetPassword({ token: 't', newPassword: 'moi' });
  expect(adapter.resetPassword).toHaveBeenCalledWith({ token: 't', new_password: 'moi' });
});
it('getMyOrders bỏ đơn hỏng và warn', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  adapter.getMyOrders.mockResolvedValue([rawOrder('CF1'), { id: 'CF2' }]);
  expect((await getMyOrders()).map((o) => o.id)).toEqual(['CF1']);
  expect(warn).toHaveBeenCalledOnce();
  warn.mockRestore();
});
it('peekResetToken gọi adapter; thiếu ở adapter ném lỗi nêu "mock"', async () => {
  adapter.peekResetToken.mockResolvedValue('abc');
  expect(await peekResetToken('a@x.vn')).toBe('abc');
  const saved = adapter.peekResetToken;
  delete adapter.peekResetToken;
  await expect(peekResetToken('a@x.vn')).rejects.toThrow(/mock/);
  adapter.peekResetToken = saved;
});
