import { formatVnd } from './money';

it('định dạng VND', () => expect(formatVnd(45000).replace(/\s/g, ' ')).toBe('45.000 ₫'));
it('0 hợp lệ', () => expect(formatVnd(0)).toBeTruthy());
it.each([-1, 1.5, NaN])('%s ném RangeError', (v) => expect(() => formatVnd(v)).toThrow(RangeError));
