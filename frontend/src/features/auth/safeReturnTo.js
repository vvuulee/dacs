const FALLBACK = '/';
// Ký tự điều khiển hoặc dấu gạch ngược có thể làm trình duyệt hiểu thành URL ngoài trang.
const UNSAFE = /[\\\u0000-\u001f]/;

export function safeReturnTo(value, fallback = FALLBACK) {
  if (typeof value !== 'string') return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  return UNSAFE.test(value) ? fallback : value;
}
