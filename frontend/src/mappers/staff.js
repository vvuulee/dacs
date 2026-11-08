import { normalizeVoucherCode } from '../features/vouchers/normalizeCode';
import { toRequestItem } from './order';
import { requireField, requireMoney } from './shared';

const VOUCHER_TYPES = ['percent', 'fixed', 'freeship'];

export function toStaff(raw) {
  return {
    id: String(requireField(raw, 'id')),
    name: requireField(raw, 'name'),
    email: requireField(raw, 'email'),
    role: requireField(raw, 'role'),
  };
}

export function toStaffAuth(raw) {
  return {
    token: requireField(raw, 'token'),
    expiresAt: requireField(raw, 'expires_at'),
    staff: toStaff(requireField(raw, 'staff')),
  };
}

export function toStaffVoucher(raw) {
  if (!VOUCHER_TYPES.includes(raw?.type)) throw new Error(`Trường "type" không hợp lệ: ${raw?.type}`);
  return {
    id: String(requireField(raw, 'id')),
    code: requireField(raw, 'code'),
    title: requireField(raw, 'title'),
    description: raw.description ?? '',
    type: raw.type,
    value: requireMoney(raw.value ?? 0, 'value'),
    maxDiscount: raw.max_discount ?? null,
    minOrder: requireMoney(raw.min_order ?? 0, 'min_order'),
    expiresAt: requireField(raw, 'expires_at'),
    listed: raw.listed === true,
  };
}

const toSourceStat = (raw, label) => ({
  count: requireMoney(raw?.count ?? 0, `${label}.count`),
  revenue: requireMoney(raw?.revenue ?? 0, `${label}.revenue`),
});

export function toDailyReport(raw) {
  const payment = raw.by_payment ?? {};
  return {
    date: requireField(raw, 'date'),
    orderCount: requireMoney(raw.order_count, 'order_count'),
    revenue: requireMoney(raw.revenue, 'revenue'),
    cancelledCount: requireMoney(raw.cancelled_count ?? 0, 'cancelled_count'),
    bySource: {
      counter: toSourceStat(raw.by_source?.counter, 'by_source.counter'),
      online: toSourceStat(raw.by_source?.online, 'by_source.online'),
    },
    byPayment: {
      cash: requireMoney(payment.cash ?? 0, 'by_payment.cash'),
      bankTransfer: requireMoney(payment.bank_transfer ?? 0, 'by_payment.bank_transfer'),
      wallet: requireMoney(payment.wallet ?? 0, 'by_payment.wallet'),
    },
  };
}

// Request không gửi giá: backend tự tính tổng, giảm giá và tiền thối.
export function toCounterOrderRequest({ items, serviceType, table, voucherCode, paymentMethod, cashReceived, clientRequestId }) {
  const request = {
    client_request_id: clientRequestId,
    service_type: serviceType,
    table: serviceType === 'dine_in' ? table.trim() : null,
    payment_method: paymentMethod,
    items: items.map(toRequestItem),
  };
  if (paymentMethod === 'cash') request.cash_received = cashReceived;
  if (voucherCode) request.voucher_code = voucherCode;
  return request;
}

// "30.000" → 30000; chuỗi rỗng → null. Form đã kiểm tra trước nên ở đây chỉ chuyển kiểu.
const toAmount = (text) => {
  const digits = String(text ?? '').replace(/[.,\s]/g, '');
  return digits === '' ? null : Number(digits);
};

export function toVoucherCreateRequest(form) {
  const [year, month, day] = form.expiresOn.split('-').map(Number);
  return {
    code: normalizeVoucherCode(form.code),
    title: form.title.trim(),
    description: form.description.trim(),
    type: form.type,
    value: form.type === 'freeship' ? 0 : toAmount(form.value),
    max_discount: form.type === 'percent' ? toAmount(form.maxDiscount) : null,
    min_order: toAmount(form.minOrder) ?? 0,
    // Hết hạn cuối ngày đã chọn theo giờ địa phương.
    expires_at: new Date(year, month - 1, day, 23, 59, 59).toISOString(),
    listed: form.listed === true,
  };
}
