import { FIELD_ORDER, validateCheckout } from './validate';

const ok = { name: 'Nguyễn An', phone: '0901234567', provinceId: 'hn', wardId: 'hn-1', street: '12 Lê Lợi', note: '', paymentMethod: 'cash' };

it('form hợp lệ → {valid:true, errors:{}}', () => expect(validateCheckout(ok)).toEqual({ valid: true, errors: {} }));
it('form rỗng → lỗi mọi trường trừ note, đúng thông điệp', () => {
  const empty = { name: '', phone: '', provinceId: '', wardId: '', street: '', note: '', paymentMethod: '' };
  const { valid, errors } = validateCheckout(empty);
  expect(valid).toBe(false);
  expect(Object.keys(errors)).toEqual(FIELD_ORDER.filter((f) => f !== 'note'));
  expect(errors.phone).toBe('Số điện thoại không hợp lệ (di động 10 số, ví dụ 0901234567)');
  expect(errors.provinceId).toBe('Chọn tỉnh/thành');
});
it.each(['   ', 'A', ' A '])('tên "%s" sau trim quá ngắn → lỗi name', (name) =>
  expect(validateCheckout({ ...ok, name }).errors.name).toBe('Nhập họ tên từ 2 đến 60 ký tự'));
it('tên 61 ký tự → lỗi; 60 ký tự → ok', () => {
  expect(validateCheckout({ ...ok, name: 'a'.repeat(61) }).errors.name).toBeDefined();
  expect(validateCheckout({ ...ok, name: 'a'.repeat(60) }).errors.name).toBeUndefined();
});
it('đường 4 ký tự → lỗi; 5 ký tự → ok; 121 → lỗi', () => {
  expect(validateCheckout({ ...ok, street: 'abcd' }).errors.street).toBe('Nhập số nhà và tên đường (5–120 ký tự)');
  expect(validateCheckout({ ...ok, street: 'abcde' }).errors.street).toBeUndefined();
  expect(validateCheckout({ ...ok, street: 'a'.repeat(121) }).errors.street).toBeDefined();
});
it('note 200 ok, 201 lỗi', () => {
  expect(validateCheckout({ ...ok, note: 'a'.repeat(200) }).valid).toBe(true);
  expect(validateCheckout({ ...ok, note: 'a'.repeat(201) }).errors.note).toBe('Ghi chú tối đa 200 ký tự');
});
it('paymentMethod "crypto" → lỗi', () =>
  expect(validateCheckout({ ...ok, paymentMethod: 'crypto' }).errors.paymentMethod).toBe('Chọn phương thức thanh toán'));
