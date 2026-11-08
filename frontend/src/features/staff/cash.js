import { CASH_ROUND_STEPS } from '../../constants';

// Chỉ nhận số nguyên, cho phép nhóm nghìn bằng dấu chấm/phẩy/khoảng trắng ("100.000", "1 000 000").
// Dấu thập phân ("50.5", "7,5") bị từ chối thay vì bị đọc nhầm thành 505 / 75.
const PLAIN = /^\d+$/;
const GROUPED = /^\d{1,3}([.,\s]\d{3})+$/;

export function parseCash(text) {
  const trimmed = String(text ?? '').trim();
  if (PLAIN.test(trimmed)) return Number(trimmed);
  if (GROUPED.test(trimmed)) return Number(trimmed.replace(/[.,\s]/g, ''));
  return null;
}

// Gợi ý số tiền khách hay đưa: đúng tổng, rồi tổng làm tròn lên theo từng mệnh giá.
export function cashSuggestions(total) {
  if (total === 0) return [0];
  const rounded = CASH_ROUND_STEPS.map((step) => Math.ceil(total / step) * step);
  return [...new Set([total, ...rounded])].sort((a, b) => a - b);
}
