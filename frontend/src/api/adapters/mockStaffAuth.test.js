import { clearSession, readSession, saveSession } from '../../features/auth/session';
import { clearStaffSession, saveStaffSession } from '../../features/staff/session';
import { STAFF_DEMO } from '../../mocks/staffStore';
import { setStaffUnauthorizedHandler, setUnauthorizedHandler } from '../client';
import { createMockAdapter } from './mockAdapter';

let adapter;
const signInStaff = (r) => saveStaffSession({ token: r.token, expiresAt: r.expires_at });

beforeEach(() => { localStorage.clear(); clearSession(); clearStaffSession(); adapter = createMockAdapter(0, () => 1_000_000); });
afterEach(() => { setStaffUnauthorizedHandler(null); setUnauthorizedHandler(null); });

it('staffLogin + staffGetMe dùng token nhân viên', async () => {
  signInStaff(await adapter.staffLogin(STAFF_DEMO));
  expect(await adapter.staffGetMe()).toMatchObject({ email: STAFF_DEMO.email, role: 'staff' });
});
it('staffGetMe với token sai → 401, gọi handler nhân viên, phiên khách còn nguyên', async () => {
  saveSession({ token: 'khach', expiresAt: '2099-01-01T00:00:00.000Z' });
  saveStaffSession({ token: 'sai', expiresAt: '2099-01-01T00:00:00.000Z' });
  const staffHandler = vi.fn();
  const customerHandler = vi.fn();
  setStaffUnauthorizedHandler(staffHandler);
  setUnauthorizedHandler(customerHandler);
  await expect(adapter.staffGetMe()).rejects.toMatchObject({ status: 401 });
  expect(staffHandler).toHaveBeenCalledTimes(1);
  expect(customerHandler).not.toHaveBeenCalled();
  expect(readSession().token).toBe('khach');
});
it('getMe của khách bị 401 không gọi handler nhân viên', async () => {
  saveSession({ token: 'sai', expiresAt: '2099-01-01T00:00:00.000Z' });
  const staffHandler = vi.fn();
  setStaffUnauthorizedHandler(staffHandler);
  await expect(adapter.getMe()).rejects.toMatchObject({ status: 401 });
  expect(staffHandler).not.toHaveBeenCalled();
});
it('token khách gọi API nhân viên → 403 và gọi handler nhân viên', async () => {
  const { token, expires_at: expiresAt } = await adapter.register({ name: 'An', email: 'an@x.vn', password: 'matkhau123' });
  saveStaffSession({ token, expiresAt });
  const staffHandler = vi.fn();
  setStaffUnauthorizedHandler(staffHandler);
  await expect(adapter.staffGetMe()).rejects.toMatchObject({ status: 403 });
  expect(staffHandler).toHaveBeenCalledTimes(1);
});
it('staffLogin sai mật khẩu → 401 nhưng không gọi handler (chưa có phiên)', async () => {
  const staffHandler = vi.fn();
  setStaffUnauthorizedHandler(staffHandler);
  await expect(adapter.staffLogin({ email: STAFF_DEMO.email, password: 'sai' })).rejects.toMatchObject({ status: 401 });
  expect(staffHandler).not.toHaveBeenCalled();
});
it('staffChangePassword và staffLogout', async () => {
  signInStaff(await adapter.staffLogin(STAFF_DEMO));
  await adapter.staffChangePassword({ current_password: STAFF_DEMO.password, new_password: 'moi12345' });
  await adapter.staffLogout();
  await expect(adapter.staffGetMe()).rejects.toMatchObject({ status: 401 });
});
