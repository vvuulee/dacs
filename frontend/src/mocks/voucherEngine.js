import { normalizeVoucherCode } from '../features/vouchers/normalizeCode';
import { formatVnd } from '../lib/money';
import { vouchers } from './offers';

const PERCENT_BASE = 100;

function discountFor(voucher, subtotal, deliveryFee) {
  if (voucher.type === 'percent') {
    const discount = Math.floor((subtotal * voucher.value) / PERCENT_BASE);
    return voucher.max_discount == null ? discount : Math.min(discount, voucher.max_discount);
  }
  if (voucher.type === 'fixed') return Math.min(voucher.value, subtotal);
  return deliveryFee; // freeship
}

// Mock đóng vai backend: dùng chung cho kiểm tra mã và đặt hàng nên số xem trước khớp số trong đơn.
export function evaluateVoucher(code, subtotal, deliveryFee, now, table = vouchers, source = 'online') {
  const voucher = table.find((v) => v.code === normalizeVoucherCode(code));
  if (!voucher) return { ok: false, reason: 'Mã giảm giá không tồn tại' };
  if (Date.parse(voucher.expires_at) <= now) return { ok: false, reason: 'Mã giảm giá đã hết hạn' };
  if (source === 'counter' && voucher.type === 'freeship') return { ok: false, reason: 'Mã chỉ áp dụng cho đơn giao hàng' };
  if (subtotal < voucher.min_order) {
    return { ok: false, reason: `Đơn hàng cần từ ${formatVnd(voucher.min_order)} để dùng mã này` };
  }
  return { ok: true, voucher, discount: discountFor(voucher, subtotal, deliveryFee) };
}
