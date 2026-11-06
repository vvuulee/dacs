import { PHONE_ERROR } from '../checkout/validate';
import { validateChangePassword, validateForgot, validateLogin, validateProfile, validateRegister, validateReset } from './validate';

const PASSWORD_ERROR = 'Mật khẩu từ 8 đến 128 ký tự';
const CONFIRM_ERROR = 'Mật khẩu nhập lại không khớp';
const reg = { name: 'Nguyễn An', email: 'an@x.vn', password: 'matkhau123', confirm: 'matkhau123' };

it('login: email sai và mật khẩu rỗng → hai lỗi đúng thông điệp', () =>
  expect(validateLogin({ email: 'abc', password: '' })).toEqual({
    valid: false, errors: { email: 'Nhập email hợp lệ', password: 'Nhập mật khẩu' },
  }));
it('login: email có khoảng trắng đầu/cuối vẫn hợp lệ', () =>
  expect(validateLogin({ email: ' an@x.vn ', password: 'x' })).toEqual({ valid: true, errors: {} }));
it('register hợp lệ', () => expect(validateRegister(reg)).toEqual({ valid: true, errors: {} }));
it.each([[7, true], [8, false], [128, false], [129, true]])('register mật khẩu %i ký tự → lỗi=%s', (n, hasError) => {
  const password = 'a'.repeat(n);
  const { errors } = validateRegister({ ...reg, password, confirm: password });
  expect(errors.password).toBe(hasError ? PASSWORD_ERROR : undefined);
});
it('register: nhập lại lệch, tên 1 ký tự, email 255 ký tự đều lỗi đúng trường', () => {
  expect(validateRegister({ ...reg, confirm: 'khac-nhau-123' }).errors.confirm).toBe(CONFIRM_ERROR);
  expect(validateRegister({ ...reg, name: 'A' }).errors.name).toBe('Nhập họ tên từ 2 đến 60 ký tự');
  expect(validateRegister({ ...reg, email: `${'a'.repeat(250)}@x.vn` }).errors.email).toBe('Nhập email hợp lệ');
});
const profile = { name: 'An', phone: '', provinceId: '', wardId: '', street: '' };
it('profile: phone rỗng và địa chỉ rỗng cả ba → hợp lệ', () => expect(validateProfile(profile).valid).toBe(true));
it('profile: phone "123" → PHONE_ERROR; phone đúng định dạng ok', () => {
  expect(validateProfile({ ...profile, phone: '123' }).errors.phone).toBe(PHONE_ERROR);
  expect(validateProfile({ ...profile, phone: '+84 901 234 567' }).valid).toBe(true);
});
it('profile: chỉ có tỉnh → lỗi phường và đường; đủ ba ô → ok; đường 4 ký tự → lỗi', () => {
  const partial = validateProfile({ ...profile, provinceId: 'hn' });
  expect(partial.errors).toEqual({ wardId: 'Chọn phường/xã', street: 'Nhập số nhà và tên đường (5–120 ký tự)' });
  expect(validateProfile({ ...profile, provinceId: 'hn', wardId: 'hn-1', street: '12 Lê Lợi' }).valid).toBe(true);
  expect(validateProfile({ ...profile, provinceId: 'hn', wardId: 'hn-1', street: 'abcd' }).errors.street).toBeDefined();
});
it('profile: tên 1 ký tự → lỗi name', () =>
  expect(validateProfile({ ...profile, name: 'A' }).errors.name).toBe('Nhập họ tên từ 2 đến 60 ký tự'));
const change = { current: 'matkhau123', next: 'matkhau456', confirm: 'matkhau456' };
it('changePassword hợp lệ', () => expect(validateChangePassword(change)).toEqual({ valid: true, errors: {} }));
it('changePassword: next trùng current, current rỗng, next ngắn, confirm lệch', () => {
  expect(validateChangePassword({ ...change, next: 'matkhau123', confirm: 'matkhau123' }).errors.next)
    .toBe('Mật khẩu mới phải khác mật khẩu hiện tại');
  expect(validateChangePassword({ ...change, current: '' }).errors.current).toBe('Nhập mật khẩu hiện tại');
  expect(validateChangePassword({ ...change, next: 'abc', confirm: 'abc' }).errors.next).toBe(PASSWORD_ERROR);
  expect(validateChangePassword({ ...change, confirm: 'khac' }).errors.confirm).toBe(CONFIRM_ERROR);
});
it('reset: khớp ok; lệch lỗi confirm; ngắn lỗi password', () => {
  expect(validateReset({ password: 'matkhau123', confirm: 'matkhau123' }).valid).toBe(true);
  expect(validateReset({ password: 'matkhau123', confirm: 'x' }).errors.confirm).toBe(CONFIRM_ERROR);
  expect(validateReset({ password: 'abc', confirm: 'abc' }).errors.password).toBe(PASSWORD_ERROR);
});

it('forgot: email hợp lệ ok; email sai → lỗi email', () => {
  expect(validateForgot({ email: ' an@x.vn ' })).toEqual({ valid: true, errors: {} });
  expect(validateForgot({ email: 'abc' })).toEqual({ valid: false, errors: { email: 'Nhập email hợp lệ' } });
});
