import { adapter } from '../api';
import { getProvinces, getWards } from './addressService';

vi.mock('../api', () => ({ adapter: { getProvinces: vi.fn(), getWards: vi.fn() } }));

it('getProvinces map dữ liệu thô', async () => {
  adapter.getProvinces.mockResolvedValue([{ id: 1, name: 'Hà Nội' }]);
  expect(await getProvinces()).toEqual([{ id: '1', name: 'Hà Nội' }]);
});
it('getWards truyền provinceId và map', async () => {
  adapter.getWards.mockResolvedValue([{ id: 'hn-1', name: 'Phường Mẫu 1' }]);
  expect(await getWards('hn')).toEqual([{ id: 'hn-1', name: 'Phường Mẫu 1' }]);
  expect(adapter.getWards).toHaveBeenCalledWith('hn');
});
