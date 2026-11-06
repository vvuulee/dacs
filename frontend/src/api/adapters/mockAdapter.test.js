import { createMockAdapter } from './mockAdapter';

const adapter = createMockAdapter(0);

it('có 6 danh mục và 24 món', async () => {
  expect(await adapter.getCategories()).toHaveLength(6);
  expect(await adapter.getProducts({})).toHaveLength(24);
});
it('lọc theo categoryId', async () => {
  const list = await adapter.getProducts({ categoryId: 'ca-phe' });
  expect(list.length).toBeGreaterThan(0);
  expect(list.every((p) => p.category_id === 'ca-phe')).toBe(true);
});
it('tìm không dấu: q="ca phe" khớp "Cà phê sữa đá"', async () => {
  const list = await adapter.getProducts({ q: 'ca phe' });
  expect(list.some((p) => p.name === 'Cà phê sữa đá')).toBe(true);
});
it('q chỉ khoảng trắng → trả đủ danh sách', async () => {
  expect(await adapter.getProducts({ q: '   ' })).toHaveLength(24);
});
it('q="(" → [] và không ném lỗi', async () => {
  expect(await adapter.getProducts({ q: '(' })).toEqual([]);
});
it('getProduct id lạ → ApiError 404', async () => {
  await expect(adapter.getProduct('khong-ton-tai')).rejects.toMatchObject({ status: 404 });
});
it('dữ liệu có món hết hàng, món không size, món không topping', async () => {
  const list = await adapter.getProducts({});
  expect(list.some((p) => p.is_available === false)).toBe(true);
  expect(list.some((p) => p.sizes.length === 0)).toBe(true);
  expect(list.some((p) => p.toppings.length === 0)).toBe(true);
});

it('mock có 3 tỉnh/thành', async () => expect(await adapter.getProvinces()).toHaveLength(3));
it('hn có 4 phường tên "Phường Mẫu 1..4"', async () => {
  const wards = await adapter.getWards('hn');
  expect(wards).toHaveLength(4);
  expect(wards[0].name).toBe('Phường Mẫu 1');
});
it('tỉnh lạ → ApiError 404', async () =>
  await expect(adapter.getWards('zzz')).rejects.toMatchObject({ status: 404 }));
