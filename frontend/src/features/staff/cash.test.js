import { cashSuggestions, parseCash } from './cash';

it.each([
  ['100.000', 100000], ['100,000', 100000], [' 58 000 ', 58000], ['0', 0], ['250000', 250000], ['1.000.000', 1000000],
])('parseCash(%j) = %i', (text, value) => expect(parseCash(text)).toBe(value));
it.each(['', '   ', 'abc', '-5', '1e5', '12.5k', '50.5', '7.5', '12,5', '1.00', '1..000', '.500', null, undefined])('parseCash(%j) = null', (text) =>
  expect(parseCash(text)).toBeNull());
it('cashSuggestions: đúng tổng rồi làm tròn lên, bỏ trùng, tăng dần', () => {
  expect(cashSuggestions(58000)).toEqual([58000, 100000, 200000, 500000]);
  expect(cashSuggestions(50000)).toEqual([50000, 100000, 200000, 500000]);
  expect(cashSuggestions(120000)).toEqual([120000, 150000, 200000, 500000]);
  expect(cashSuggestions(0)).toEqual([0]);
});
