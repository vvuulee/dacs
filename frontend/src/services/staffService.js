import { adapter } from '../api';
import { toOrder } from '../mappers/order';
import { toProduct } from '../mappers/product';
import { mapList } from '../mappers/shared';
import { toDailyReport, toStaff, toStaffAuth, toStaffVoucher } from '../mappers/staff';

// Email cắt khoảng trắng thừa; mật khẩu gửi nguyên văn và không bao giờ được log.
export async function login({ email, password }) {
  return toStaffAuth(await adapter.staffLogin({ email: email.trim(), password }));
}

export async function logout() {
  await adapter.staffLogout();
}

export async function getMe() {
  return toStaff(await adapter.staffGetMe());
}

export async function changePassword({ currentPassword, newPassword }) {
  await adapter.staffChangePassword({ current_password: currentPassword, new_password: newPassword });
}

// request đã ở dạng API (toCounterOrderRequest).
export async function createCounterOrder(request) {
  return toOrder(await adapter.staffCreateOrder(request));
}

export async function getOnlineOrders(status) {
  return mapList(await adapter.staffGetOnlineOrders(status ? { status } : {}), toOrder, 'đơn');
}

export async function updateOrderStatus(id, status) {
  return toOrder(await adapter.staffUpdateOrderStatus(id, status));
}

export async function getTodayOrders() {
  return mapList(await adapter.staffGetTodayOrders(), toOrder, 'đơn');
}

export async function getTodayReport() {
  return toDailyReport(await adapter.staffGetTodayReport());
}

export async function getVouchers() {
  return mapList(await adapter.staffGetVouchers(), toStaffVoucher, 'voucher');
}

// request đã ở dạng API (toVoucherCreateRequest).
export async function createVoucher(request) {
  return toStaffVoucher(await adapter.staffCreateVoucher(request));
}

export async function deleteVoucher(id) {
  await adapter.staffDeleteVoucher(id);
}

export async function getProducts() {
  return mapList(await adapter.staffGetProducts(), toProduct, 'món');
}

export async function setAvailability(id, isAvailable) {
  return toProduct(await adapter.staffSetAvailability(id, isAvailable));
}
