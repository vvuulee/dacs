import { calcUnitPrice } from './price';

const p = {
  basePrice: 45000,
  sizes: [{ id: 'm', label: 'M', extraPrice: 6000 }],
  toppings: [{ id: 'tc', name: 'Trân châu', price: 8000 }, { id: 'th', name: 'Thạch', price: 5000 }],
};

it('cộng size và topping', () => expect(calcUnitPrice(p, 'm', ['tc', 'th'])).toBe(64000));
it('topping không tồn tại bị bỏ qua', () => expect(calcUnitPrice(p, 'm', ['zzz'])).toBe(51000));
it('topping trùng chỉ tính một lần', () => expect(calcUnitPrice(p, 'm', ['tc', 'tc'])).toBe(59000));
it('size không tồn tại ném lỗi nêu sizeId', () => expect(() => calcUnitPrice(p, 'xl', [])).toThrow(/xl/));
it('món không có size, sizeId null → basePrice', () =>
  expect(calcUnitPrice({ ...p, sizes: [] }, null, [])).toBe(45000));
it('món có size nhưng sizeId null ném lỗi', () => expect(() => calcUnitPrice(p, null, [])).toThrow());
