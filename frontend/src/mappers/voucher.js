import { VOUCHER_UNUSABLE_TEXT } from '../features/vouchers/messages';
import { toRequestItem } from './order';
import { requireField } from './shared';

// Lý do nghiệp vụ (hết hạn, chưa đủ đơn tối thiểu...) luôn là phản hồi 200 với valid:false.
export function toVoucherResult(raw) {
  if (raw?.valid === true) {
    const { discount } = raw;
    if (!Number.isInteger(discount) || discount < 0) {
      throw new Error(`Trường "discount" phải là số nguyên ≥ 0, nhận được: ${discount}`);
    }
    return { valid: true, code: requireField(raw, 'code'), title: requireField(raw, 'title'), discount };
  }
  if (raw?.valid === false) {
    const reason = typeof raw.reason === 'string' ? raw.reason.trim() : '';
    return { valid: false, reason: reason || VOUCHER_UNUSABLE_TEXT };
  }
  throw new Error(`Trường "valid" không hợp lệ: ${raw?.valid}`);
}

// Không gửi giá và không gửi ghi chú: backend tự tính mức giảm từ món, size, topping, số lượng.
export function toVoucherRequest({ code, items }) {
  return { code, items: items.map((item) => { const { note: _note, ...forVoucher } = toRequestItem(item); return forVoucher; }) };
}
