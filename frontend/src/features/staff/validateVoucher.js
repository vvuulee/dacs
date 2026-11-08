import { VOUCHER_DESCRIPTION_MAX, VOUCHER_TITLE_MAX } from '../../constants';
import { isVoucherCode, normalizeVoucherCode } from '../vouchers/normalizeCode';
import { parseCash } from './cash';

const PERCENT_MAX = 100;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n) => String(n).padStart(2, '0');
const localDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Kiểm tra trước cho dễ dùng; backend vẫn kiểm lại đúng các quy tắc này (spec mục 5).
export function validateVoucherForm(form, today = new Date()) {
  const errors = {};
  if (!isVoucherCode(normalizeVoucherCode(form.code))) errors.code = 'Mã 3–32 ký tự, chỉ chữ không dấu, số và dấu gạch ngang';
  const title = form.title.trim();
  if (!title || title.length > VOUCHER_TITLE_MAX) errors.title = `Tiêu đề từ 1 đến ${VOUCHER_TITLE_MAX} ký tự`;
  if (form.description.trim().length > VOUCHER_DESCRIPTION_MAX) errors.description = `Mô tả tối đa ${VOUCHER_DESCRIPTION_MAX} ký tự`;

  const value = parseCash(form.value);
  // Phần trăm chỉ nhận số nguyên không dấu phân cách: "7.5" không được thành 75%.
  const percentOk = /^\d+$/.test(form.value.trim()) && value >= 1 && value <= PERCENT_MAX;
  if (form.type === 'percent' && !percentOk) errors.value = 'Phần trăm là số nguyên từ 1 đến 100';
  if (form.type === 'fixed' && (value === null || value <= 0)) errors.value = 'Số tiền phải lớn hơn 0';

  if (form.type === 'percent' && form.maxDiscount.trim() !== '') {
    const max = parseCash(form.maxDiscount);
    if (max === null || max <= 0) errors.maxDiscount = 'Để trống hoặc nhập số tiền lớn hơn 0';
  }
  if (form.minOrder.trim() !== '' && parseCash(form.minOrder) === null) errors.minOrder = 'Nhập số tiền (0 nếu không yêu cầu)';
  // Chuỗi YYYY-MM-DD so sánh được theo thứ tự từ điển.
  if (!DATE_PATTERN.test(form.expiresOn) || form.expiresOn <= localDate(today)) errors.expiresOn = 'Hạn dùng phải sau hôm nay';
  return { valid: Object.keys(errors).length === 0, errors };
}
