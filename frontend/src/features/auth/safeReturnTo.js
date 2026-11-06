const FALLBACK = '/';
// Ký tự điều khiển hoặc dấu gạch ngược có thể làm trình duyệt hiểu thành URL ngoài trang.
const UNSAFE = /[\\\u0000-\u001f]/;

export function safeReturnTo(value) {
  if (typeof value !== 'string') return FALLBACK;
  if (!value.startsWith('/') || value.startsWith('//')) return FALLBACK;
  return UNSAFE.test(value) ? FALLBACK : value;
}
