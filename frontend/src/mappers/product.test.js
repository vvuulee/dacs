import { toProduct, toProducts } from './product';

const raw = {
  id: 1, name: 'Cà phê sữa', description: 'Đậm vị', image: 'x.png', category_id: 'c1',
  base_price: 45000, is_available: true,
  sizes: [{ id: 'm', label: 'M', extra_price: 6000 }],
  toppings: [{ id: 'tc', name: 'Trân châu', price: 8000 }],
};

it('map snake_case → camelCase', () =>
  expect(toProduct(raw)).toMatchObject({
    id: '1', categoryId: 'c1', basePrice: 45000, isAvailable: true,
    sizes: [{ id: 'm', label: 'M', extraPrice: 6000 }],
  }));
it('trường thiếu dùng mặc định', () =>
  expect(toProduct({ id: 1, name: 'A', base_price: 1000 })).toMatchObject({
    description: '', image: '', sizes: [], toppings: [], isAvailable: true,
  }));
it('thiếu name ném lỗi nêu "name"', () =>
  expect(() => toProduct({ id: '1', base_price: 1 })).toThrow(/name/));
it.each([null, -5, 'abc'])('base_price %s ném lỗi', (v) =>
  expect(() => toProduct({ id: '1', name: 'A', base_price: v })).toThrow(/base_price/));
it('toProducts bỏ món hỏng, giữ món tốt, có warn', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  expect(toProducts([raw, { id: 'x' }])).toHaveLength(1);
  expect(warn).toHaveBeenCalledOnce();
  warn.mockRestore();
});
it('toProducts nhận mảng rỗng', () => expect(toProducts([])).toEqual([]));
