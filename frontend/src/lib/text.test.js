import { normalizeText } from './text';

it('bỏ dấu, hạ chữ thường, đ→d', () => expect(normalizeText('Cà Phê Sữa Đá')).toBe('ca phe sua da'));
it('rỗng/null/undefined → ""', () => {
  expect(normalizeText('')).toBe('');
  expect(normalizeText(null)).toBe('');
  expect(normalizeText(undefined)).toBe('');
});
it('chỉ khoảng trắng → ""', () => expect(normalizeText('   ')).toBe(''));
it('gộp khoảng trắng, giữ ký tự đặc biệt', () => expect(normalizeText(' a  (b) ')).toBe('a (b)'));
