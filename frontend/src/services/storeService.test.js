import { adapter } from '../api';
import { getStores } from './storeService';

vi.mock('../api', () => ({ adapter: { getStores: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());

it('truyền filter cho adapter và map sang Store', async () => {
  adapter.getStores.mockResolvedValue([{ id: 1, name: 'A', province_id: 'hn' }]);
  const list = await getStores({ provinceId: 'hn', q: 'a' });
  expect(adapter.getStores).toHaveBeenCalledWith({ provinceId: 'hn', q: 'a' });
  expect(list[0]).toMatchObject({ id: '1', provinceId: 'hn' });
});
it('không truyền filter → adapter nhận {}', async () => {
  adapter.getStores.mockResolvedValue([]);
  await getStores();
  expect(adapter.getStores).toHaveBeenCalledWith({});
});
it('bỏ cửa hàng hỏng và warn', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  adapter.getStores.mockResolvedValue([{ id: 1, name: 'A' }, { id: 2 }]);
  expect(await getStores()).toHaveLength(1);
  expect(warn).toHaveBeenCalledOnce();
  warn.mockRestore();
});
