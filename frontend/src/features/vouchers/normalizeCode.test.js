import { isVoucherCode, normalizeVoucherCode } from './normalizeCode';

it.each([[' chao10 ', 'CHAO10'], ['giam 20k', 'GIAM20K'], ['', ''], [null, ''], [undefined, ''], [42, '42']])(
  'normalizeVoucherCode(%j) → %j',
  (input, expected) => expect(normalizeVoucherCode(input)).toBe(expected),
);
it.each(['CHAO10', 'FREE-SHIP', 'ABC'])('%s hợp lệ', (v) => expect(isVoucherCode(v)).toBe(true));
it.each(['AB', 'A'.repeat(33), 'chao10', 'CHAO 10', 'CHAO_10', 'CHÀO10', ''])('"%s" không hợp lệ', (v) =>
  expect(isVoucherCode(v)).toBe(false));
it('độ dài biên: 3 và 32 ký tự hợp lệ', () => {
  expect(isVoucherCode('A'.repeat(3))).toBe(true);
  expect(isVoucherCode('A'.repeat(32))).toBe(true);
});
