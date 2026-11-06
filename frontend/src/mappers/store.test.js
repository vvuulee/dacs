import { toStore, toStores } from './store';

const raw = {
  id: 3, name: 'Cửa hàng Mẫu 1', province_id: 'hn', province_name: 'Hà Nội', ward_name: 'Phường Mẫu 1',
  street: '12 Phố Mẫu', phone: '02800000001', opening_hours: '07:00 – 22:00',
};
afterEach(() => vi.restoreAllMocks());

it('toStore map snake_case → camelCase, id số → chuỗi', () =>
  expect(toStore(raw)).toEqual({
    id: '3', name: 'Cửa hàng Mẫu 1', street: '12 Phố Mẫu', wardName: 'Phường Mẫu 1', provinceId: 'hn',
    provinceName: 'Hà Nội', phone: '02800000001', openingHours: '07:00 – 22:00',
  }));
it('toStore thiếu trường tùy chọn → ""', () =>
  expect(toStore({ id: 1, name: 'A' })).toMatchObject({ street: '', wardName: '', provinceId: '', provinceName: '', phone: '', openingHours: '' }));
it.each(['id', 'name'])('toStore thiếu %s ném lỗi nêu tên', (field) =>
  expect(() => toStore({ ...raw, [field]: undefined })).toThrow(new RegExp(field)));
it('toStores bỏ phần tử hỏng và warn một lần', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  expect(toStores([raw, { id: 9 }, { name: 'thiếu id' }])).toHaveLength(1);
  expect(warn).toHaveBeenCalledTimes(2);
});
it('toStores nhận mảng rỗng', () => expect(toStores([])).toEqual([]));
