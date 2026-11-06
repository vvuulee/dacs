import { adapter } from '../api';
import { toOrder } from '../mappers/order';
import { normalizePhone } from '../lib/phone';

export async function createOrder(request) {
  return toOrder(await adapter.createOrder(request));
}

export async function getOrder(id, phone) {
  return toOrder(await adapter.getOrder(id, phone ? normalizePhone(phone) : undefined));
}

// Chỉ mock mới giả lập được thanh toán; backend thật báo qua trạng thái đơn.
export async function simulatePayment(id) {
  if (typeof adapter.simulatePayment !== 'function') {
    throw new Error('simulatePayment chỉ có ở chế độ mock');
  }
  return toOrder(await adapter.simulatePayment(id));
}
