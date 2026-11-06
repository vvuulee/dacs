import { MOCK_SESSIONS_KEY, MOCK_USERS_KEY } from '../constants';
import {
  CURRENT_PASSWORD_WRONG_TEXT, EMAIL_TAKEN_TEXT, LOGIN_FAILED_TEXT, NOT_LOGGED_IN_TEXT, RESET_LINK_INVALID_TEXT,
} from '../features/auth/messages';
import { createAuthStore } from './authStore';

const t0 = 1_000_000;
const DAY = 86400000;
const RESET_TTL = 900000;
let clock;
let store;
const NEW = { name: 'An', email: 'an@x.vn', password: 'matkhau123' };
const catchErr = (fn) => { try { fn(); } catch (error) { return error; } throw new Error('Không ném lỗi'); };
const addr = { province_id: 'hn', ward_id: 'hn-1', street: '12 Lê Lợi' };

beforeEach(() => { localStorage.clear(); clock = t0; store = createAuthStore(() => clock); });

it('register ok: token, hạn 24 giờ, user không có mật khẩu, mật khẩu không lưu nguyên văn', () => {
  const result = store.register({ name: 'An', email: 'An@X.vn ', password: 'matkhau123' });
  expect(result.token).toMatch(/^[0-9a-f]{32}$/);
  expect(result.expires_at).toBe(new Date(t0 + DAY).toISOString());
  expect(result.user).toEqual({ id: expect.any(String), name: 'An', email: 'an@x.vn', phone: null, address: null });
  expect(JSON.stringify(result)).not.toContain('matkhau123');
  expect(localStorage.getItem(MOCK_USERS_KEY)).not.toContain('matkhau123');
});
it('register email trùng (khác hoa thường) → 409 EMAIL_TAKEN_TEXT', () => {
  store.register(NEW);
  const error = catchErr(() => store.register({ ...NEW, email: 'AN@x.vn' }));
  expect([error.status, error.message]).toEqual([409, EMAIL_TAKEN_TEXT]);
});
it.each([
  ['tên 1 ký tự', { name: 'A' }],
  ['email sai', { email: 'abc' }],
  ['mật khẩu 7 ký tự', { password: 'a'.repeat(7) }],
])('register %s → 422', (_, over) => expect(catchErr(() => store.register({ ...NEW, ...over })).status).toBe(422));
it('login đúng trả token và user', () => {
  store.register(NEW);
  const result = store.login({ email: ' AN@x.vn', password: 'matkhau123' });
  expect(result.token).toMatch(/^[0-9a-f]{32}$/);
  expect(result.user.email).toBe('an@x.vn');
});
it('login sai mật khẩu và email không tồn tại → cùng status 401 và cùng message', () => {
  store.register(NEW);
  const wrongPassword = catchErr(() => store.login({ email: 'an@x.vn', password: 'sai-mat-khau' }));
  const unknownEmail = catchErr(() => store.login({ email: 'khong@co.vn', password: 'matkhau123' }));
  expect([wrongPassword.status, wrongPassword.message]).toEqual([401, LOGIN_FAILED_TEXT]);
  expect([unknownEmail.status, unknownEmail.message]).toEqual([wrongPassword.status, wrongPassword.message]);
});
it('requireUser: token lạ hoặc thiếu → 401 NOT_LOGGED_IN_TEXT', () => {
  const error = catchErr(() => store.requireUser('khong-co'));
  expect([error.status, error.message]).toEqual([401, NOT_LOGGED_IN_TEXT]);
  expect(catchErr(() => store.requireUser(null)).status).toBe(401);
});
it('requireUser: đúng mốc hết hạn → 401 và phiên bị xóa', () => {
  const { token } = store.register(NEW);
  clock = t0 + DAY - 1;
  expect(store.requireUser(token).email).toBe('an@x.vn');
  clock = t0 + DAY;
  expect(catchErr(() => store.requireUser(token)).status).toBe(401);
  expect(JSON.parse(localStorage.getItem(MOCK_SESSIONS_KEY))).toEqual([]);
});
it('logout xóa phiên; logout không token hoặc token lạ không ném', () => {
  const { token } = store.register(NEW);
  store.logout(token);
  expect(catchErr(() => store.requireUser(token)).status).toBe(401);
  expect(() => store.logout(null)).not.toThrow();
  expect(() => store.logout('zzz')).not.toThrow();
});
it('updateProfile: lưu tên, SĐT chuẩn hóa, địa chỉ', () => {
  const { token } = store.register(NEW);
  const user = store.updateProfile(token, { name: 'An B', phone: '+84 901 234 567', address: addr });
  expect(user).toMatchObject({ name: 'An B', phone: '0901234567', address: addr });
  expect(store.updateProfile(token, { name: 'An B', phone: null, address: null })).toMatchObject({ phone: null, address: null });
});
it.each([
  ['phone "123"', { phone: '123', address: null }],
  ['tỉnh lạ', { phone: null, address: { ...addr, province_id: 'zzz' } }],
  ['phường không thuộc tỉnh', { phone: null, address: { ...addr, ward_id: 'hcm-1' } }],
  ['tên 1 ký tự', { name: 'A', phone: null, address: null }],
])('updateProfile %s → 422', (_, over) => {
  const { token } = store.register(NEW);
  expect(catchErr(() => store.updateProfile(token, { name: 'An', ...over })).status).toBe(422);
});
it('changePassword: sai hiện tại → 422; đúng thì đăng nhập bằng mật khẩu mới, mật khẩu cũ hết dùng', () => {
  const { token } = store.register(NEW);
  const wrong = catchErr(() => store.changePassword(token, { current_password: 'sai', new_password: 'matkhau456' }));
  expect([wrong.status, wrong.message]).toEqual([422, CURRENT_PASSWORD_WRONG_TEXT]);
  store.changePassword(token, { current_password: 'matkhau123', new_password: 'matkhau456' });
  expect(store.login({ email: 'an@x.vn', password: 'matkhau456' }).token).toBeDefined();
  expect(catchErr(() => store.login({ email: 'an@x.vn', password: 'matkhau123' })).status).toBe(401);
});
it('changePassword: mật khẩu mới 7 ký tự → 422', () => {
  const { token } = store.register(NEW);
  expect(catchErr(() => store.changePassword(token, { current_password: 'matkhau123', new_password: 'a'.repeat(7) })).status).toBe(422);
});
it('forgotPassword: email lạ không ném và không có token; email có tài khoản có token', () => {
  store.register(NEW);
  expect(() => store.forgotPassword({ email: 'khong@co.vn' })).not.toThrow();
  expect(store.peekResetToken('khong@co.vn')).toBeNull();
  store.forgotPassword({ email: 'An@x.vn' });
  expect(store.peekResetToken('an@x.vn')).toMatch(/^[0-9a-f]{32}$/);
});
it('resetPassword dùng token một lần: lần hai → 400 RESET_LINK_INVALID_TEXT', () => {
  store.register(NEW);
  store.forgotPassword({ email: 'an@x.vn' });
  const token = store.peekResetToken('an@x.vn');
  store.resetPassword({ token, new_password: 'matkhau456' });
  const again = catchErr(() => store.resetPassword({ token, new_password: 'matkhau789' }));
  expect([again.status, again.message]).toEqual([400, RESET_LINK_INVALID_TEXT]);
  expect(store.login({ email: 'an@x.vn', password: 'matkhau456' }).token).toBeDefined();
});
it('resetPassword hủy mọi phiên cũ của người đó', () => {
  const { token: oldSession } = store.register(NEW);
  const { token: secondSession } = store.login({ email: 'an@x.vn', password: 'matkhau123' });
  store.forgotPassword({ email: 'an@x.vn' });
  store.resetPassword({ token: store.peekResetToken('an@x.vn'), new_password: 'matkhau456' });
  expect(catchErr(() => store.requireUser(oldSession)).status).toBe(401);
  expect(catchErr(() => store.requireUser(secondSession)).status).toBe(401);
});
it('resetPassword: token hết hạn → 400; mật khẩu mới 7 ký tự → 422 và token vẫn dùng được', () => {
  store.register(NEW);
  store.forgotPassword({ email: 'an@x.vn' });
  const token = store.peekResetToken('an@x.vn');
  expect(catchErr(() => store.resetPassword({ token, new_password: 'a'.repeat(7) })).status).toBe(422);
  clock = t0 + RESET_TTL - 1;
  expect(() => store.resetPassword({ token, new_password: 'matkhau456' })).not.toThrow();
  store.forgotPassword({ email: 'an@x.vn' });
  const second = store.peekResetToken('an@x.vn');
  clock += RESET_TTL;
  expect(catchErr(() => store.resetPassword({ token: second, new_password: 'matkhau789' })).status).toBe(400);
});
it('forgotPassword lần hai thay token cũ: token cũ → 400', () => {
  store.register(NEW);
  store.forgotPassword({ email: 'an@x.vn' });
  const first = store.peekResetToken('an@x.vn');
  store.forgotPassword({ email: 'an@x.vn' });
  expect(catchErr(() => store.resetPassword({ token: first, new_password: 'matkhau456' })).status).toBe(400);
});
