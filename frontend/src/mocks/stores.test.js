import { isVoucherCode } from '../features/vouchers/normalizeCode';
import { provinces } from './addresses';
import { vouchers } from './offers';
import { stores } from './stores';

it('có 9 cửa hàng mẫu, 3 cửa hàng mỗi tỉnh/thành', () => {
  expect(stores).toHaveLength(9);
  for (const province of provinces) expect(stores.filter((s) => s.province_id === province.id)).toHaveLength(3);
});
it('province_name khớp mocks/addresses; id duy nhất; tên là tên mẫu; số điện thoại chỉ có chữ số', () => {
  expect(new Set(stores.map((s) => s.id)).size).toBe(9);
  for (const store of stores) {
    expect(provinces.find((p) => p.id === store.province_id)?.name).toBe(store.province_name);
    expect(store.name).toMatch(/^Cửa hàng Mẫu \d$/);
    expect(store.phone).toMatch(/^\d{11}$/);
    expect(store.opening_hours).toMatch(/^\d{2}:\d{2} – \d{2}:\d{2}$/);
  }
});
it('mọi mã voucher duy nhất và khớp định dạng; có đúng một mã không liệt kê và đã hết hạn', () => {
  expect(new Set(vouchers.map((v) => v.code)).size).toBe(vouchers.length);
  for (const voucher of vouchers) expect(isVoucherCode(voucher.code)).toBe(true);
  expect(vouchers.filter((v) => v.listed)).toHaveLength(4);
  const hidden = vouchers.filter((v) => !v.listed);
  expect(hidden.map((v) => v.code)).toEqual(['HETHAN']);
  expect(Date.parse(hidden[0].expires_at)).toBeLessThan(Date.now());
});
