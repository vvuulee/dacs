import {
  EMAIL_MAX, NAME_MAX, NAME_MIN, PASSWORD_MAX, PASSWORD_MIN, STREET_MAX, STREET_MIN,
} from '../../constants';
import { isValidPhone } from '../../lib/phone';
import { PHONE_ERROR } from '../checkout/validate';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESSAGES = {
  email: 'Nhập email hợp lệ',
  loginPassword: 'Nhập mật khẩu',
  password: `Mật khẩu từ ${PASSWORD_MIN} đến ${PASSWORD_MAX} ký tự`,
  confirm: 'Mật khẩu nhập lại không khớp',
  name: `Nhập họ tên từ ${NAME_MIN} đến ${NAME_MAX} ký tự`,
  current: 'Nhập mật khẩu hiện tại',
  sameAsCurrent: 'Mật khẩu mới phải khác mật khẩu hiện tại',
  provinceId: 'Chọn tỉnh/thành',
  wardId: 'Chọn phường/xã',
  street: `Nhập số nhà và tên đường (${STREET_MIN}–${STREET_MAX} ký tự)`,
};

const inRange = (text, min, max) => text.trim().length >= min && text.trim().length <= max;
const isEmail = (email) => email.trim().length <= EMAIL_MAX && EMAIL_PATTERN.test(email.trim());
const isNewPassword = (password) => password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX;
const result = (errors) => ({ valid: Object.keys(errors).length === 0, errors });

export function validateLogin({ email, password }) {
  const errors = {};
  if (!isEmail(email)) errors.email = MESSAGES.email;
  if (!password) errors.password = MESSAGES.loginPassword;
  return result(errors);
}

export function validateForgot({ email }) {
  return result(isEmail(email) ? {} : { email: MESSAGES.email });
}

export function validateRegister({ name, email, password, confirm }) {
  const errors = {};
  if (!inRange(name, NAME_MIN, NAME_MAX)) errors.name = MESSAGES.name;
  if (!isEmail(email)) errors.email = MESSAGES.email;
  if (!isNewPassword(password)) errors.password = MESSAGES.password;
  if (confirm !== password) errors.confirm = MESSAGES.confirm;
  return result(errors);
}

export function validateProfile({ name, phone, provinceId, wardId, street }) {
  const errors = {};
  if (!inRange(name, NAME_MIN, NAME_MAX)) errors.name = MESSAGES.name;
  if (phone.trim() && !isValidPhone(phone)) errors.phone = PHONE_ERROR;
  // Địa chỉ: hoặc để trống cả ba ô, hoặc điền đủ cả ba.
  if (provinceId || wardId || street.trim()) {
    if (!provinceId) errors.provinceId = MESSAGES.provinceId;
    if (!wardId) errors.wardId = MESSAGES.wardId;
    if (!inRange(street, STREET_MIN, STREET_MAX)) errors.street = MESSAGES.street;
  }
  return result(errors);
}

export function validateChangePassword({ current, next, confirm }) {
  const errors = {};
  if (!current) errors.current = MESSAGES.current;
  if (!isNewPassword(next)) errors.next = MESSAGES.password;
  else if (next === current) errors.next = MESSAGES.sameAsCurrent;
  if (confirm !== next) errors.confirm = MESSAGES.confirm;
  return result(errors);
}

export function validateReset({ password, confirm }) {
  const errors = {};
  if (!isNewPassword(password)) errors.password = MESSAGES.password;
  if (confirm !== password) errors.confirm = MESSAGES.confirm;
  return result(errors);
}
