import { toAuthResponse, toProfileRequest, toUser } from './user';

const rawUser = { id: 7, name: 'An', email: 'a@x.vn', phone: '0901234567', address: { province_id: 'hn', ward_id: 'hn-1', street: '12 Lê Lợi' } };
const rawAuth = { token: 'tk', expires_at: '2026-11-01T00:00:00.000Z', user: rawUser };

it('toUser map snake_case, id số → chuỗi', () =>
  expect(toUser(rawUser)).toEqual({ id: '7', name: 'An', email: 'a@x.vn', phone: '0901234567', address: { provinceId: 'hn', wardId: 'hn-1', street: '12 Lê Lợi' } }));
it('phone null → "" và address null giữ null', () =>
  expect(toUser({ ...rawUser, phone: null, address: null })).toMatchObject({ phone: '', address: null }));
it.each(['id', 'name', 'email'])('thiếu %s ném lỗi nêu tên', (field) =>
  expect(() => toUser({ ...rawUser, [field]: undefined })).toThrow(new RegExp(field)));
it('address thiếu ward_id ném lỗi nêu tên trường', () =>
  expect(() => toUser({ ...rawUser, address: { province_id: 'hn', street: 'x' } })).toThrow(/ward_id/));
it('toAuthResponse', () =>
  expect(toAuthResponse(rawAuth)).toMatchObject({ token: 'tk', expiresAt: '2026-11-01T00:00:00.000Z', user: { id: '7' } }));
it.each(['token', 'expires_at', 'user'])('toAuthResponse thiếu %s ném lỗi', (field) =>
  expect(() => toAuthResponse({ ...rawAuth, [field]: undefined })).toThrow(new RegExp(field)));
it('toProfileRequest chuẩn hóa', () =>
  expect(toProfileRequest({ name: ' An ', phone: '+84 901 234 567', provinceId: 'hn', wardId: 'hn-1', street: ' 12 Lê Lợi ' }))
    .toEqual({ name: 'An', phone: '0901234567', address: { province_id: 'hn', ward_id: 'hn-1', street: '12 Lê Lợi' } }));
it('toProfileRequest: phone rỗng → null, địa chỉ rỗng → null', () =>
  expect(toProfileRequest({ name: 'An', phone: '  ', provinceId: '', wardId: '', street: '' }))
    .toEqual({ name: 'An', phone: null, address: null }));
