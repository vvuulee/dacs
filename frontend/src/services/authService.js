import { adapter } from '../api';
import { toOrder } from '../mappers/order';
import { mapList } from '../mappers/shared';
import { toAuthResponse, toProfileRequest, toUser } from '../mappers/user';

// Email cắt khoảng trắng thừa; mật khẩu gửi nguyên văn và không bao giờ được log.
const credentials = ({ email, password }) => ({ email: email.trim(), password });

export async function register({ name, email, password }) {
  return toAuthResponse(await adapter.register({ name, ...credentials({ email, password }) }));
}

export async function login({ email, password }) {
  return toAuthResponse(await adapter.login(credentials({ email, password })));
}

export async function logout() {
  await adapter.logout();
}

export async function getMe() {
  return toUser(await adapter.getMe());
}

export async function updateProfile(profile) {
  return toUser(await adapter.updateMe(toProfileRequest(profile)));
}

export async function changePassword({ currentPassword, newPassword }) {
  await adapter.changePassword({ current_password: currentPassword, new_password: newPassword });
}

export async function forgotPassword(email) {
  await adapter.forgotPassword({ email: email.trim() });
}

export async function resetPassword({ token, newPassword }) {
  await adapter.resetPassword({ token, new_password: newPassword });
}

export async function getMyOrders() {
  return mapList(await adapter.getMyOrders(), toOrder, 'đơn');
}

// Chỉ mock: backend thật gửi email, frontend không đọc được token đặt lại.
export async function peekResetToken(email) {
  if (typeof adapter.peekResetToken !== 'function') throw new Error('peekResetToken chỉ có ở chế độ mock');
  return adapter.peekResetToken(email.trim());
}
