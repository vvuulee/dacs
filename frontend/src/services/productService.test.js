import { adapter } from '../api';
import { getProduct, getProducts } from './productService';

vi.mock('../api', () => ({ adapter: { getProducts: vi.fn(), getProduct: vi.fn() } }));

const raw = { id: 1, name: 'A', category_id: 'c1', base_price: 1000 };

it('getProducts map sang Product camelCase và truyền filter', async () => {
  adapter.getProducts.mockResolvedValue([raw]);
  const list = await getProducts({ categoryId: 'c1', q: 'a' });
  expect(adapter.getProducts).toHaveBeenCalledWith({ categoryId: 'c1', q: 'a' });
  expect(list[0]).toMatchObject({ id: '1', categoryId: 'c1', basePrice: 1000 });
});
it('getProduct map dữ liệu thô', async () => {
  adapter.getProduct.mockResolvedValue(raw);
  expect(await getProduct('1')).toMatchObject({ id: '1', basePrice: 1000 });
});
it('getProduct truyền ApiError 404 lên trên', async () => {
  adapter.getProduct.mockRejectedValue(Object.assign(new Error('x'), { status: 404 }));
  await expect(getProduct('9')).rejects.toMatchObject({ status: 404 });
});
