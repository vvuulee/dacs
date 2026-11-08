import { ApiError } from '../api/client';
import {
  MAX_QTY, MIN_QTY, MOCK_DELIVERY_FEE, MOCK_ORDERS_KEY, PAYMENT_TTL_MS, TABLE_MAX, VOUCHER_INVALID_CODE,
} from '../constants';
import { canTransition, isOnlinePayment, PAYMENT_METHODS, STATUS_LABELS } from '../features/orders/orderStatus';
import { normalizeVoucherCode } from '../features/vouchers/normalizeCode';
import { provinces, wardsByProvince } from './addresses';
import { products } from './products';
import { withAvailability } from './availabilityStore';
import { evaluateVoucher } from './voucherEngine';
import { loadVouchers } from './voucherStore';

const ORDER_ID_DIGITS = 8;
const invalid = (message) => new ApiError(422, message);
const iso = (ms) => new Date(ms).toISOString();

export function newOrderId() {
  const n = Math.floor(Math.random() * 10 ** ORDER_ID_DIGITS);
  return `CF${String(n).padStart(ORDER_ID_DIGITS, '0')}`;
}

// Trạng thái do nhân viên chuyển và được lưu; chỉ hạn thanh toán online còn tính theo thời gian.
// Đơn lưu từ bản cũ chưa có status thì coi là placed.
export function computeOrderStatus(order, now) {
  if (order.source === 'counter') return { status: 'completed', paymentStatus: 'paid' };
  if (!isOnlinePayment(order.payment_method)) {
    return { status: order.status ?? 'placed', paymentStatus: 'unpaid' };
  }
  if (order.paid_at) {
    const status = !order.status || order.status === 'awaiting_payment' ? 'placed' : order.status;
    return { status, paymentStatus: 'paid' };
  }
  const created = Date.parse(order.created_at);
  return now < created + PAYMENT_TTL_MS
    ? { status: 'awaiting_payment', paymentStatus: 'pending' }
    : { status: 'cancelled', paymentStatus: 'expired' };
}

export function transitionOrder(order, next, now) {
  const { status } = computeOrderStatus(order, now);
  if (order.source === 'counter' || !canTransition(status, next)) {
    throw new ApiError(409, `Không thể chuyển đơn từ "${STATUS_LABELS[status]}" sang "${STATUS_LABELS[next] ?? next}"`);
  }
  return { ...order, status: next };
}

export function loadStoredOrders() {
  try {
    const raw = localStorage.getItem(MOCK_ORDERS_KEY);
    if (raw === null) return [];
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data;
    console.warn('Đơn mock đã lưu không hợp lệ, bắt đầu danh sách trống.');
  } catch (error) {
    console.warn(`Không đọc được đơn mock đã lưu: ${error.name}`);
  }
  return [];
}

export function saveStoredOrders(orders) {
  try {
    localStorage.setItem(MOCK_ORDERS_KEY, JSON.stringify(orders));
  } catch (error) {
    console.warn(`Không lưu được đơn mock: ${error.name}`);
  }
}

// Request không có giá; mock đóng vai backend và tự tính từ danh mục món mẫu.
function priceItem(item) {
  const found = products.find((p) => p.id === item.product_id);
  if (!found) throw invalid(`Món không tồn tại: ${item.product_id}`);
  const product = withAvailability(found);
  if (product.is_available === false) throw invalid(`Món ${product.name} đã hết`);
  if (!Number.isInteger(item.quantity) || item.quantity < MIN_QTY || item.quantity > MAX_QTY) {
    throw invalid(`Số lượng không hợp lệ: ${item.quantity}`);
  }
  const hasSizes = product.sizes.length > 0;
  const size = hasSizes ? product.sizes.find((s) => s.id === item.size_id) : undefined;
  if (hasSizes && !size) throw invalid(`Size không hợp lệ: ${item.size_id}`);
  const toppings = [...new Set(item.topping_ids ?? [])].map((id) => {
    const topping = product.toppings.find((t) => t.id === id);
    if (!topping) throw invalid(`Topping không hợp lệ: ${id}`);
    return topping;
  });
  const unitPrice = product.base_price + (size?.extra_price ?? 0) + toppings.reduce((sum, t) => sum + t.price, 0);
  return {
    product_id: product.id,
    name: product.name,
    summary: [size?.label, ...toppings.map((t) => t.name)].filter(Boolean).join(' · '),
    note: (item.note ?? '').trim(),
    quantity: item.quantity,
    unit_price: unitPrice,
  };
}

// Dùng chung cho đặt hàng và kiểm tra mã để số xem trước khớp số trong đơn.
export function priceItems(items) {
  const priced = items.map(priceItem);
  return { items: priced, subtotal: priced.reduce((sum, item) => sum + item.unit_price * item.quantity, 0) };
}

// Đánh giá mã tại thời điểm đặt: mã đã hết hạn giữa chừng bị từ chối kèm mã lỗi máy đọc được.
function applyVoucher(code, subtotal, now, deliveryFee = MOCK_DELIVERY_FEE, source = 'online') {
  if (!code) return { voucherCode: null, discount: 0 };
  const result = evaluateVoucher(code, subtotal, deliveryFee, now, loadVouchers(), source);
  if (!result.ok) throw new ApiError(422, result.reason, VOUCHER_INVALID_CODE);
  return { voucherCode: normalizeVoucherCode(code), discount: result.discount };
}

export function buildStoredOrder(request, now, userId = null) {
  if (!PAYMENT_METHODS.some((m) => m.id === request.payment_method)) {
    throw invalid(`Phương thức thanh toán không hợp lệ: ${request.payment_method}`);
  }
  if (!request.items?.length) throw invalid('Đơn hàng không có món nào');
  const { province_id: provinceId, ward_id: wardId, street } = request.address;
  const province = provinces.find((p) => p.id === provinceId);
  const ward = wardsByProvince[provinceId]?.find((w) => w.id === wardId);
  if (!province || !ward) throw invalid('Địa chỉ giao hàng không hợp lệ');
  const { items, subtotal } = priceItems(request.items);
  const { voucherCode, discount } = applyVoucher(request.voucher_code, subtotal, now);
  return {
    id: newOrderId(),
    source: 'online',
    service_type: 'delivery',
    status: isOnlinePayment(request.payment_method) ? 'awaiting_payment' : 'placed',
    payment_method: request.payment_method,
    customer: request.customer,
    address: { province_name: province.name, ward_name: ward.name, street },
    note: request.note ?? '',
    items,
    subtotal,
    delivery_fee: MOCK_DELIVERY_FEE,
    discount,
    voucher_code: voucherCode,
    total: subtotal + MOCK_DELIVERY_FEE - discount,
    created_at: iso(now),
    paid_at: null,
    client_request_id: request.client_request_id,
    user_id: userId,
  };
}

const COUNTER_SERVICE_TYPES = ['dine_in', 'takeaway'];
const COUNTER_PAYMENT_METHODS = ['cash', 'bank_transfer'];

// Đơn tại quầy: không phí giao, trả tiền ngay nên hoàn tất luôn; tiền thối do mock (backend) tính.
export function buildCounterOrder(request, now, staffId) {
  if (!COUNTER_SERVICE_TYPES.includes(request.service_type)) throw invalid(`Hình thức không hợp lệ: ${request.service_type}`);
  if (!COUNTER_PAYMENT_METHODS.includes(request.payment_method)) {
    throw invalid(`Phương thức thanh toán không hợp lệ: ${request.payment_method}`);
  }
  const table = request.service_type === 'dine_in' ? String(request.table ?? '').trim() : null;
  if (table !== null && (table.length < 1 || table.length > TABLE_MAX)) throw invalid('Số bàn không hợp lệ');
  if (!request.items?.length) throw invalid('Đơn hàng không có món nào');
  const { items, subtotal } = priceItems(request.items);
  const { voucherCode, discount } = applyVoucher(request.voucher_code, subtotal, now, 0, 'counter');
  const total = subtotal - discount;
  let cashReceived = null;
  if (request.payment_method === 'cash') {
    cashReceived = request.cash_received;
    if (!Number.isInteger(cashReceived) || cashReceived < total) throw invalid('Tiền khách đưa không đủ');
  }
  return {
    id: newOrderId(),
    source: 'counter',
    service_type: request.service_type,
    table,
    status: 'completed',
    payment_method: request.payment_method,
    customer: null,
    address: null,
    note: '',
    items,
    subtotal,
    delivery_fee: 0,
    discount,
    voucher_code: voucherCode,
    total,
    cash_received: cashReceived,
    change: cashReceived === null ? null : cashReceived - total,
    created_at: iso(now),
    paid_at: iso(now),
    client_request_id: request.client_request_id,
    user_id: null,
    staff_id: staffId,
  };
}

// shortcut: "hôm nay" theo giờ máy chạy mock; backend thật dùng múi giờ của quán.
export const isToday = (isoString, now) => new Date(isoString).toDateString() === new Date(now).toDateString();

export function toRawOrder(stored, now) {
  const { paid_at: _paidAt, client_request_id: _requestId, user_id: _userId, staff_id: _staffId, ...rest } = stored;
  const { status, paymentStatus } = computeOrderStatus(stored, now);
  const payment = status === 'awaiting_payment'
    ? { expires_at: iso(Date.parse(stored.created_at) + PAYMENT_TTL_MS), qr_content: `COFFEE-${stored.id}-${stored.total}` }
    : null;
  return {
    source: 'online', service_type: 'delivery', table: null, cash_received: null, change: null,
    ...rest, status, payment_status: paymentStatus, payment,
  };
}
