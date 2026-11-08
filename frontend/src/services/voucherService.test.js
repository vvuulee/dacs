import { adapter } from '../api';
import { validateVoucher } from './voucherService';

vi.mock('../api', () => ({ adapter: { validateVoucher: vi.fn() } }));
const items = [{ productId: 'tra-dao', sizeId: 'm', toppingIds: ['b', 'a'], note: 'ít đá', quantity: 2, unitPrice: 57000, name: 'x', image: '', summary: '', key: 'k' }];

it('gửi toVoucherRequest (không giá, không note) và trả VoucherResult', async () => {
  adapter.validateVoucher.mockResolvedValue({ valid: true, code: 'CHAO10', title: 'Giảm 10%', discount: 10200 });
  expect(await validateVoucher({ code: 'CHAO10', items })).toEqual({ valid: true, code: 'CHAO10', title: 'Giảm 10%', discount: 10200 });
  const sent = adapter.validateVoucher.mock.calls[0][0];
  expect(sent).toEqual({ code: 'CHAO10', items: [{ product_id: 'tra-dao', size_id: 'm', topping_ids: ['a', 'b'], quantity: 2 }] });
  expect(JSON.stringify(sent)).not.toMatch(/price|note/i);
});
it('valid:false giữ lý do', async () => {
  adapter.validateVoucher.mockResolvedValue({ valid: false, reason: 'Mã giảm giá đã hết hạn' });
  expect(await validateVoucher({ code: 'HETHAN', items })).toEqual({ valid: false, reason: 'Mã giảm giá đã hết hạn' });
});
it('phản hồi lạ ({ valid: "yes" }) → ném lỗi', async () => {
  adapter.validateVoucher.mockResolvedValue({ valid: 'yes' });
  await expect(validateVoucher({ code: 'X', items })).rejects.toThrow(/valid/);
});
it('có source thì gửi kèm source; không có thì không gửi', async () => {
  adapter.validateVoucher.mockResolvedValue({ valid: false, reason: 'x' });
  await validateVoucher({ code: 'A1B', items, source: 'counter' });
  await validateVoucher({ code: 'A1B', items });
  expect(adapter.validateVoucher.mock.calls.at(-2)[0].source).toBe('counter');
  expect(adapter.validateVoucher.mock.calls.at(-1)[0]).not.toHaveProperty('source');
});
