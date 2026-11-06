import { isValidPhone, normalizePhone } from './phone';

it.each([
  ['+84 901 234 567', '0901234567'],
  ['0901.234.567', '0901234567'],
  ['090-123-4567', '0901234567'],
  ['', ''],
])('chuẩn hóa %s → %s', (input, expected) => expect(normalizePhone(input)).toBe(expected));
it.each(['0901234567', '+84901234567', '0351234567'])('%s hợp lệ', (v) => expect(isValidPhone(v)).toBe(true));
it.each(['0201234567', '090123456', '09012345678', 'abc', ''])('"%s" không hợp lệ', (v) =>
  expect(isValidPhone(v)).toBe(false));
