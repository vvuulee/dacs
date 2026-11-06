import { safeReturnTo } from './safeReturnTo';

it.each(['/menu', '/account?x=1', '/orders/CF1#a'])('%s hợp lệ', (v) => expect(safeReturnTo(v)).toBe(v));
it.each(['//evil.com', 'https://evil.com', '/\\evil', 'javascript:alert(1)', '', null, undefined, 42, '/a\nb'])(
  '%s → "/"',
  (v) => expect(safeReturnTo(v)).toBe('/'),
);
