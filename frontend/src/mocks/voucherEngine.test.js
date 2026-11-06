import { vouchers } from './offers';
import { evaluateVoucher } from './voucherEngine';

const NOW = Date.parse('2026-10-30T00:00:00Z');
const FEE = 15000;
const spaced = (text) => text.replace(/\s/g, ' ');
const chao10 = vouchers.find((v) => v.code === 'CHAO10');

it.each([
  ['CHAO10', 100000, 10000], ['CHAO10', 50000, 5000], ['CHAO10', 400000, 30000],
  ['GIAM20K', 100000, 20000], ['FREESHIP', 80000, 15000], ['COMBO15', 150000, 22500], ['COMBO15', 400000, 50000],
])('%s với tạm tính %i → giảm %i', (code, subtotal, expected) =>
  expect(evaluateVoucher(code, subtotal, FEE, NOW)).toMatchObject({ ok: true, discount: expected }));
it('mã chữ thường và có khoảng trắng vẫn khớp', () =>
  expect(evaluateVoucher(' chao10 ', 100000, FEE, NOW)).toMatchObject({ ok: true, discount: 10000 }));
it('trả kèm voucher để lấy tiêu đề', () => expect(evaluateVoucher('CHAO10', 100000, FEE, NOW).voucher.title).toBe(chao10.title));
it('mã lạ → "Mã giảm giá không tồn tại"', () =>
  expect(evaluateVoucher('XYZ999', 100000, FEE, NOW)).toEqual({ ok: false, reason: 'Mã giảm giá không tồn tại' }));
it('HETHAN → "Mã giảm giá đã hết hạn", kiểm tra hết hạn trước đơn tối thiểu', () =>
  expect(evaluateVoucher('HETHAN', 1, FEE, NOW)).toEqual({ ok: false, reason: 'Mã giảm giá đã hết hạn' }));
it('đúng mốc hết hạn là đã hết hạn; trước 1ms còn hạn', () => {
  const table = [{ ...chao10, expires_at: new Date(NOW).toISOString() }];
  expect(evaluateVoucher('CHAO10', 100000, FEE, NOW, table).ok).toBe(false);
  expect(evaluateVoucher('CHAO10', 100000, FEE, NOW - 1, table).ok).toBe(true);
});
it.each([
  ['CHAO10', 49999, '50.000 ₫'], ['GIAM20K', 99999, '100.000 ₫'], ['FREESHIP', 79999, '80.000 ₫'], ['COMBO15', 149999, '150.000 ₫'],
])('%s dưới đơn tối thiểu (%i) → lý do nêu %s', (code, subtotal, money) =>
  expect(spaced(evaluateVoucher(code, subtotal, FEE, NOW).reason)).toBe(`Đơn hàng cần từ ${money} để dùng mã này`));
it('đúng đơn tối thiểu thì dùng được (biên)', () => {
  expect(evaluateVoucher('CHAO10', 50000, FEE, NOW).ok).toBe(true);
  expect(evaluateVoucher('CHAO10', 49999, FEE, NOW).ok).toBe(false);
});
it('giảm cố định không vượt tạm tính (bảng thử: giá trị 50000, tạm tính 30000 → 30000)', () => {
  const table = [{ code: 'FIX', title: 'x', type: 'fixed', value: 50000, max_discount: null, min_order: 0, expires_at: '2099-01-01T00:00:00.000Z' }];
  expect(evaluateVoucher('FIX', 30000, FEE, NOW, table)).toMatchObject({ ok: true, discount: 30000 });
});
it('phần trăm không có trần: giảm đúng floor, không vượt tạm tính', () => {
  const table = [{ code: 'PCT', title: 'x', type: 'percent', value: 100, max_discount: null, min_order: 0, expires_at: '2099-01-01T00:00:00.000Z' }];
  expect(evaluateVoucher('PCT', 12345, FEE, NOW, table).discount).toBe(12345);
  expect(evaluateVoucher('PCT', 0, FEE, NOW, table).discount).toBe(0);
});
it('mức giảm không bao giờ vượt tạm tính (percent/fixed) hay phí giao (freeship) trên nhiều tạm tính', () => {
  for (const subtotal of [0, 1, 999, 100000, 150000, 1e7]) {
    for (const code of ['CHAO10', 'GIAM20K', 'FREESHIP', 'COMBO15']) {
      const result = evaluateVoucher(code, subtotal, FEE, NOW);
      if (result.ok) expect(result.discount).toBeLessThanOrEqual(code === 'FREESHIP' ? FEE : subtotal);
    }
  }
});
