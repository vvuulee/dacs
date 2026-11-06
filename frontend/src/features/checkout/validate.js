import { NAME_MAX, NAME_MIN, NOTE_MAX_LENGTH, STREET_MAX, STREET_MIN } from '../../constants';
import { isValidPhone } from '../../lib/phone';
import { PAYMENT_METHODS } from '../orders/orderStatus';

export const PHONE_ERROR = 'Số điện thoại không hợp lệ (di động 10 số, ví dụ 0901234567)';

export const FIELD_ORDER = ['name', 'phone', 'provinceId', 'wardId', 'street', 'note', 'paymentMethod'];

const inRange = (text, min, max) => text.trim().length >= min && text.trim().length <= max;

const RULES = {
  name: [(f) => inRange(f.name, NAME_MIN, NAME_MAX), `Nhập họ tên từ ${NAME_MIN} đến ${NAME_MAX} ký tự`],
  phone: [(f) => isValidPhone(f.phone), PHONE_ERROR],
  provinceId: [(f) => Boolean(f.provinceId), 'Chọn tỉnh/thành'],
  wardId: [(f) => Boolean(f.wardId), 'Chọn phường/xã'],
  street: [(f) => inRange(f.street, STREET_MIN, STREET_MAX), `Nhập số nhà và tên đường (${STREET_MIN}–${STREET_MAX} ký tự)`],
  note: [(f) => f.note.length <= NOTE_MAX_LENGTH, `Ghi chú tối đa ${NOTE_MAX_LENGTH} ký tự`],
  paymentMethod: [(f) => PAYMENT_METHODS.some((m) => m.id === f.paymentMethod), 'Chọn phương thức thanh toán'],
};

export function validateCheckout(form) {
  const errors = {};
  for (const field of FIELD_ORDER) {
    const [isValid, message] = RULES[field];
    if (!isValid(form)) errors[field] = message;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}
