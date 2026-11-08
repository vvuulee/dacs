import { PAYMENT_METHODS, PAYMENT_STATUS_LABELS, STATUS_LABELS } from '../features/orders/orderStatus';
import { normalizePhone } from '../lib/phone';
import { requireField, requireMoney } from './shared';

const STATUSES = Object.keys(STATUS_LABELS);
const PAYMENT_STATUSES = Object.keys(PAYMENT_STATUS_LABELS);
const METHOD_IDS = PAYMENT_METHODS.map((m) => m.id);

function oneOf(value, allowed, label) {
  if (!allowed.includes(value)) throw new Error(`Trường "${label}" không hợp lệ: ${value}`);
  return value;
}

function toOrderItem(raw) {
  if (!Number.isInteger(raw.quantity) || raw.quantity < 1) {
    throw new Error(`Trường "quantity" của món phải là số nguyên ≥ 1, nhận được: ${raw.quantity}`);
  }
  return {
    productId: String(requireField(raw, 'product_id')),
    name: requireField(raw, 'name'),
    summary: raw.summary ?? '',
    note: raw.note ?? '',
    quantity: raw.quantity,
    unitPrice: requireMoney(raw.unit_price, 'unit_price'),
  };
}

// Backend cũ chưa trả discount: coi như không giảm.
function toDiscount(value) {
  if (value === undefined || value === null) return 0;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Trường "discount" phải là số nguyên ≥ 0, nhận được: ${value}`);
  }
  return value;
}

const SOURCES = ['online', 'counter'];
const SERVICE_TYPES = ['delivery', 'dine_in', 'takeaway'];

// Đơn quầy không có khách/địa chỉ; đơn online vẫn bắt buộc như trước.
function toCustomer(customer) {
  return { name: requireField(customer, 'name', 'customer.name'), phone: requireField(customer, 'phone', 'customer.phone') };
}

function toAddress(address) {
  return {
    provinceName: requireField(address, 'province_name', 'address.province_name'),
    wardName: requireField(address, 'ward_name', 'address.ward_name'),
    street: requireField(address, 'street', 'address.street'),
  };
}

const toOptionalMoney = (value, label) => (value === undefined || value === null ? null : requireMoney(value, label));

export function toOrder(raw) {
  const source = oneOf(raw.source ?? 'online', SOURCES, 'source');
  const counter = source === 'counter';
  return {
    id: String(requireField(raw, 'id')),
    status: oneOf(raw.status, STATUSES, 'status'),
    paymentMethod: oneOf(raw.payment_method, METHOD_IDS, 'payment_method'),
    paymentStatus: oneOf(raw.payment_status, PAYMENT_STATUSES, 'payment_status'),
    source,
    serviceType: oneOf(raw.service_type ?? (counter ? 'takeaway' : 'delivery'), SERVICE_TYPES, 'service_type'),
    table: raw.table ?? null,
    cashReceived: toOptionalMoney(raw.cash_received, 'cash_received'),
    change: toOptionalMoney(raw.change, 'change'),
    customer: counter ? null : toCustomer(raw.customer ?? {}),
    address: counter ? null : toAddress(raw.address ?? {}),
    note: raw.note ?? '',
    items: (raw.items ?? []).map(toOrderItem),
    subtotal: requireMoney(raw.subtotal, 'subtotal'),
    deliveryFee: requireMoney(raw.delivery_fee, 'delivery_fee'),
    discount: toDiscount(raw.discount),
    voucherCode: raw.voucher_code ?? null,
    total: requireMoney(raw.total, 'total'),
    createdAt: requireField(raw, 'created_at'),
    payment: raw.payment
      ? { expiresAt: requireField(raw.payment, 'expires_at'), qrContent: requireField(raw.payment, 'qr_content') }
      : null,
  };
}

export function toRequestItem(item) {
  return {
    product_id: item.productId,
    size_id: item.sizeId,
    topping_ids: [...item.toppingIds].sort(),
    note: item.note.trim(),
    quantity: item.quantity,
  };
}

// Request không gửi giá: backend tự tính giá món, phí giao, mức giảm và tổng tiền.
export function toOrderRequest({ form, items, clientRequestId, voucherCode }) {
  const request = {
    client_request_id: clientRequestId,
    customer: { name: form.name.trim(), phone: normalizePhone(form.phone) },
    address: { province_id: form.provinceId, ward_id: form.wardId, street: form.street.trim() },
    note: form.note.trim(),
    payment_method: form.paymentMethod,
    items: items.map(toRequestItem),
  };
  if (voucherCode) request.voucher_code = voucherCode;
  return request;
}
