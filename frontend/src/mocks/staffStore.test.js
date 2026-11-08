import { MOCK_SESSION_TTL_MS } from '../constants';
import { createAuthStore } from './authStore';
import { createStaffStore, STAFF_DEMO } from './staffStore';

let clock;
let store;
beforeEach(() => { localStorage.clear(); clock = 1_000_000; store = createStaffStore(() => clock); });

it('đăng nhập bằng tài khoản mẫu → token và staff không có mật khẩu', () => {
  const result = store.login({ email: ' NhanVien@caphe.test ', password: STAFF_DEMO.password });
  expect(result.token).toMatch(/^[0-9a-f]{32}$/);
  expect(result.staff).toEqual({ id: 's1', name: 'Nhân viên Mẫu', email: 'nhanvien@caphe.test', role: 'staff' });
  expect(JSON.stringify(result)).not.toContain(STAFF_DEMO.password);
});
it('sai mật khẩu → 401 cùng thông báo', () =>
  expect(() => store.login({ email: STAFF_DEMO.email, password: 'sai' })).toThrow(expect.objectContaining({ status: 401, message: 'Email hoặc mật khẩu không đúng' })));
it('tài khoản khách không đăng nhập được trang nhân viên', () => {
  createAuthStore(() => clock).register({ name: 'An', email: 'an@x.vn', password: 'matkhau123' });
  expect(() => store.login({ email: 'an@x.vn', password: 'matkhau123' })).toThrow(expect.objectContaining({ status: 401 }));
});
it('requireStaff: không token / token lạ → 401', () => {
  expect(() => store.requireStaff(null)).toThrow(expect.objectContaining({ status: 401 }));
  expect(() => store.requireStaff('zzz')).toThrow(expect.objectContaining({ status: 401 }));
});
it('requireStaff với token khách → 403', () => {
  const { token } = createAuthStore(() => clock).register({ name: 'An', email: 'an@x.vn', password: 'matkhau123' });
  expect(() => store.requireStaff(token)).toThrow(expect.objectContaining({ status: 403, message: 'Bạn không có quyền truy cập trang nhân viên' }));
});
it('token hết hạn → 401', () => {
  const { token } = store.login(STAFF_DEMO);
  clock += MOCK_SESSION_TTL_MS;
  expect(() => store.requireStaff(token)).toThrow(expect.objectContaining({ status: 401 }));
});
it('logout thu hồi token', () => {
  const { token } = store.login(STAFF_DEMO);
  store.logout(token);
  expect(() => store.requireStaff(token)).toThrow(expect.objectContaining({ status: 401 }));
});
it('đổi mật khẩu: sai mật khẩu cũ → 422; đúng thì đăng nhập bằng mật khẩu mới', () => {
  const { token } = store.login(STAFF_DEMO);
  expect(() => store.changePassword(token, { current_password: 'sai', new_password: 'moi12345' })).toThrow(expect.objectContaining({ status: 422 }));
  store.changePassword(token, { current_password: STAFF_DEMO.password, new_password: 'moi12345' });
  expect(() => store.login(STAFF_DEMO)).toThrow(expect.objectContaining({ status: 401 }));
  expect(store.login({ email: STAFF_DEMO.email, password: 'moi12345' }).token).toBeDefined();
});
