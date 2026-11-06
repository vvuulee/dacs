import { cartReducer, makeCartKey } from './cartReducer';

const base = { productId: '1', name: 'A', image: '', sizeId: 'm', toppingIds: ['a', 'b'], note: 'ít đá', quantity: 1, unitPrice: 50000 };

it('key không phụ thuộc thứ tự topping và khoảng trắng ghi chú', () =>
  expect(makeCartKey({ productId: '1', sizeId: 'm', toppingIds: ['b', 'a'], note: ' ít đá ' })).toBe(
    makeCartKey({ productId: '1', sizeId: 'm', toppingIds: ['a', 'b'], note: 'ít đá' }),
  ));
it('ADD cùng key gộp dòng', () => {
  const once = cartReducer([], { type: 'ADD', item: base });
  const next = cartReducer(once, { type: 'ADD', item: { ...base, toppingIds: ['b', 'a'], note: '  ít đá ', quantity: 2 } });
  expect(next).toHaveLength(1);
  expect(next[0].quantity).toBe(3);
});
it('ADD khác size thì tách dòng', () => {
  const once = cartReducer([], { type: 'ADD', item: base });
  expect(cartReducer(once, { type: 'ADD', item: { ...base, sizeId: 'l' } })).toHaveLength(2);
});
it('ADD vượt 99 kẹp ở 99', () => {
  const once = cartReducer([], { type: 'ADD', item: { ...base, quantity: 98 } });
  expect(cartReducer(once, { type: 'ADD', item: { ...base, quantity: 5 } })[0].quantity).toBe(99);
});
it('SET_QTY 0 xóa dòng', () => {
  const [line] = cartReducer([], { type: 'ADD', item: base });
  expect(cartReducer([line], { type: 'SET_QTY', key: line.key, quantity: 0 })).toEqual([]);
});
it('SET_QTY 150 kẹp 99', () => {
  const [line] = cartReducer([], { type: 'ADD', item: base });
  expect(cartReducer([line], { type: 'SET_QTY', key: line.key, quantity: 150 })[0].quantity).toBe(99);
});
it('REMOVE và CLEAR', () => {
  const [line] = cartReducer([], { type: 'ADD', item: base });
  expect(cartReducer([line], { type: 'REMOVE', key: line.key })).toEqual([]);
  expect(cartReducer([line], { type: 'CLEAR' })).toEqual([]);
});
it('reducer không đột biến state cũ', () => {
  const state = cartReducer([], { type: 'ADD', item: base });
  const snapshot = JSON.stringify(state);
  cartReducer(state, { type: 'ADD', item: base });
  expect(JSON.stringify(state)).toBe(snapshot);
});
it('action lạ ném lỗi nêu type', () => expect(() => cartReducer([], { type: 'NOPE' })).toThrow(/NOPE/));
