import { VOUCHER_UNUSABLE_TEXT } from '../features/vouchers/messages';
import { toVoucherRequest, toVoucherResult } from './voucher';

it('toVoucherResult hợp lệ', () =>
  expect(toVoucherResult({ valid: true, code: 'CHAO10', title: 'Giảm 10%', discount: 10200 }))
    .toEqual({ valid: true, code: 'CHAO10', title: 'Giảm 10%', discount: 10200 }));
it('toVoucherResult hợp lệ với discount 0', () =>
  expect(toVoucherResult({ valid: true, code: 'A', title: 'T', discount: 0 }).discount).toBe(0));
it('toVoucherResult không hợp lệ giữ reason đã cắt khoảng trắng', () =>
  expect(toVoucherResult({ valid: false, reason: ' Mã giảm giá đã hết hạn ' })).toEqual({ valid: false, reason: 'Mã giảm giá đã hết hạn' }));
it.each([[{ valid: false }], [{ valid: false, reason: '  ' }], [{ valid: false, reason: 5 }]])(
  'toVoucherResult %j thiếu reason → VOUCHER_UNUSABLE_TEXT',
  (raw) => expect(toVoucherResult(raw)).toEqual({ valid: false, reason: VOUCHER_UNUSABLE_TEXT }),
);
it.each([
  [{ valid: true, code: 'A', title: 'T', discount: -1 }],
  [{ valid: true, code: 'A', title: 'T', discount: 1.5 }],
  [{ valid: true, code: 'A', title: 'T' }],
  [{ valid: true, title: 'T', discount: 1 }],
  [{ valid: 'yes' }],
  [{}],
  [null],
])('toVoucherResult %j ném lỗi', (raw) => expect(() => toVoucherResult(raw)).toThrow());
it('toVoucherRequest: món gửi {product_id,size_id,topping_ids sắp xếp,quantity}, không note, không giá', () => {
  const request = toVoucherRequest({
    code: 'CHAO10',
    items: [{ productId: 'tra-dao', sizeId: 'm', toppingIds: ['b', 'a'], note: 'ít đá', quantity: 2, unitPrice: 57000, name: 'x', image: '', summary: '', key: 'k' }],
  });
  expect(request).toEqual({ code: 'CHAO10', items: [{ product_id: 'tra-dao', size_id: 'm', topping_ids: ['a', 'b'], quantity: 2 }] });
  expect(JSON.stringify(request)).not.toMatch(/price|note/i);
});
