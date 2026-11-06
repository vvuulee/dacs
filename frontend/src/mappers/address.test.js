import { toProvinces, toWards } from './address';

afterEach(() => vi.restoreAllMocks());

it('toProvinces bỏ phần tử thiếu name và warn', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  expect(toProvinces([{ id: 'hn', name: 'Hà Nội' }, { id: 'x' }])).toEqual([{ id: 'hn', name: 'Hà Nội' }]);
  expect(warn).toHaveBeenCalledOnce();
});
it('toWards chuyển id số thành chuỗi', () =>
  expect(toWards([{ id: 7, name: 'Phường Mẫu 7' }])).toEqual([{ id: '7', name: 'Phường Mẫu 7' }]));
it('danh sách rỗng → []', () => expect(toWards([])).toEqual([]));
