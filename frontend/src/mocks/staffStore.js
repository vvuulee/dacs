import { ApiError } from '../api/client';
import {
  MOCK_SESSION_TTL_MS, MOCK_SESSIONS_KEY, MOCK_STAFF_PASSWORDS_KEY, MOCK_STAFF_SESSIONS_KEY, PASSWORD_MAX, PASSWORD_MIN,
} from '../constants';
import { CURRENT_PASSWORD_WRONG_TEXT, LOGIN_FAILED_TEXT, NOT_LOGGED_IN_TEXT } from '../features/auth/messages';
import { hashPassword, loadList, newToken, saveList } from './authStore';

export const STAFF_FORBIDDEN_TEXT = 'Bạn không có quyền truy cập trang nhân viên';

// Tài khoản mẫu chỉ có ở mock (ghi trong README). Backend thật quản lý nhân viên riêng.
export const STAFF_DEMO = { email: 'nhanvien@caphe.test', password: 'nhanvien123' };
const STAFF = [{ id: 's1', name: 'Nhân viên Mẫu', email: STAFF_DEMO.email, role: 'staff' }];
const DEMO_HASH = hashPassword(STAFF_DEMO.email, STAFF_DEMO.password);

const iso = (ms) => new Date(ms).toISOString();
const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase();

export function createStaffStore(now = () => Date.now()) {
  const passwordHash = (staff) =>
    loadList(MOCK_STAFF_PASSWORDS_KEY).find((p) => p.staff_id === staff.id)?.password_hash ?? DEMO_HASH;

  function requireStaff(token) {
    const unauthorized = () => new ApiError(401, NOT_LOGGED_IN_TEXT);
    if (!token) throw unauthorized();
    const sessions = loadList(MOCK_STAFF_SESSIONS_KEY);
    const session = sessions.find((s) => s.token === token);
    if (!session) {
      // Token hợp lệ của khách: đã đăng nhập nhưng không có quyền.
      const customer = loadList(MOCK_SESSIONS_KEY).find((s) => s.token === token && Date.parse(s.expires_at) > now());
      if (customer) throw new ApiError(403, STAFF_FORBIDDEN_TEXT);
      throw unauthorized();
    }
    if (Date.parse(session.expires_at) <= now()) {
      saveList(MOCK_STAFF_SESSIONS_KEY, sessions.filter((s) => s.token !== token));
      throw unauthorized();
    }
    const staff = STAFF.find((s) => s.id === session.staff_id);
    if (!staff) throw unauthorized();
    return staff;
  }

  return {
    requireStaff,
    login({ email, password }) {
      const staff = STAFF.find((s) => s.email === normalizeEmail(email));
      if (!staff || passwordHash(staff) !== hashPassword(staff.email, String(password ?? ''))) {
        throw new ApiError(401, LOGIN_FAILED_TEXT);
      }
      const session = { token: newToken(), staff_id: staff.id, expires_at: iso(now() + MOCK_SESSION_TTL_MS) };
      saveList(MOCK_STAFF_SESSIONS_KEY, [...loadList(MOCK_STAFF_SESSIONS_KEY), session]);
      return { token: session.token, expires_at: session.expires_at, staff: { ...staff } };
    },
    logout(token) {
      if (!token) return;
      saveList(MOCK_STAFF_SESSIONS_KEY, loadList(MOCK_STAFF_SESSIONS_KEY).filter((s) => s.token !== token));
    },
    changePassword(token, { current_password: current, new_password: next }) {
      const staff = requireStaff(token);
      if (passwordHash(staff) !== hashPassword(staff.email, String(current ?? ''))) {
        throw new ApiError(422, CURRENT_PASSWORD_WRONG_TEXT);
      }
      if (typeof next !== 'string' || next.length < PASSWORD_MIN || next.length > PASSWORD_MAX) {
        throw new ApiError(422, `Mật khẩu từ ${PASSWORD_MIN} đến ${PASSWORD_MAX} ký tự`);
      }
      const others = loadList(MOCK_STAFF_PASSWORDS_KEY).filter((p) => p.staff_id !== staff.id);
      saveList(MOCK_STAFF_PASSWORDS_KEY, [...others, { staff_id: staff.id, password_hash: hashPassword(staff.email, next) }]);
    },
  };
}
