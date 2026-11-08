import { validateVoucherForm } from './validateVoucher';

const TODAY = new Date(2026, 10, 7, 10, 0);
const form = (over = {}) => ({
  code: 'TET-2027', title: 'Tết', description: '', type: 'percent', value: '10', maxDiscount: '', minOrder: '0',
  expiresOn: '2027-01-31', listed: true, ...over,
});
const errorsOf = (over) => validateVoucherForm(form(over), TODAY).errors;

it('form hợp lệ', () => expect(validateVoucherForm(form(), TODAY)).toEqual({ valid: true, errors: {} }));
it.each([
  ['mã quá ngắn', { code: 'ab' }, 'code'],
  ['mã có ký tự lạ', { code: 'TẾT!' }, 'code'],
  ['tiêu đề trống', { title: '  ' }, 'title'],
  ['tiêu đề 81 ký tự', { title: 'x'.repeat(81) }, 'title'],
  ['mô tả 201 ký tự', { description: 'x'.repeat(201) }, 'description'],
  ['percent 101', { value: '101' }, 'value'],
  ['percent 0', { value: '0' }, 'value'],
  ['percent trống', { value: '' }, 'value'],
  ['percent thập phân 7.5', { value: '7.5' }, 'value'],
  ['percent thập phân 12,5', { value: '12,5' }, 'value'],
  ['percent có dấu nghìn 1.000', { value: '1.000' }, 'value'],
  ['fixed thập phân', { type: 'fixed', value: '20.5' }, 'value'],
  ['fixed 0', { type: 'fixed', value: '0' }, 'value'],
  ['fixed chữ', { type: 'fixed', value: 'abc' }, 'value'],
  ['giảm tối đa 0', { maxDiscount: '0' }, 'maxDiscount'],
  ['đơn tối thiểu chữ', { minOrder: 'x' }, 'minOrder'],
  ['hạn bằng hôm nay', { expiresOn: '2026-11-07' }, 'expiresOn'],
  ['hạn ở quá khứ', { expiresOn: '2026-01-01' }, 'expiresOn'],
  ['thiếu hạn', { expiresOn: '' }, 'expiresOn'],
])('%s → lỗi %s', (_, over, field) => expect(errorsOf(over)).toHaveProperty(field));
it('freeship để trống giá trị vẫn hợp lệ; giảm tối đa bỏ qua với loại khác %', () => {
  expect(validateVoucherForm(form({ type: 'freeship', value: '' }), TODAY).valid).toBe(true);
  expect(validateVoucherForm(form({ type: 'fixed', value: '20.000', maxDiscount: '0' }), TODAY).valid).toBe(true);
});
it('hạn ngày mai hợp lệ; số có dấu chấm hợp lệ', () =>
  expect(validateVoucherForm(form({ expiresOn: '2026-11-08', maxDiscount: '30.000', minOrder: '50.000' }), TODAY).valid).toBe(true));
