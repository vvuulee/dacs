import { adapter } from '../api';
import { saveStaffSession } from '../features/staff/session';
import { STAFF_DEMO } from '../mocks/staffStore';

// Đăng nhập nhân viên mẫu qua adapter (mock) và lưu phiên, dùng trong test trang nhân viên.
export async function signInStaff() {
  const result = await adapter.staffLogin(STAFF_DEMO);
  saveStaffSession({ token: result.token, expiresAt: result.expires_at });
  return result;
}
