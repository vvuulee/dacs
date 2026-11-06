import { act, renderHook } from '@testing-library/react';
import { CART_STORAGE_KEY } from '../../constants';
import { CartProvider, useCart } from './CartContext';
import { selectCount } from './selectors';

const item = { productId: '1', name: 'A', image: '', sizeId: null, toppingIds: [], note: '', quantity: 2, unitPrice: 30000 };

beforeEach(() => localStorage.clear());

it('thêm món → count cập nhật và localStorage được ghi', () => {
  const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
  act(() => result.current.add(item));
  expect(selectCount(result.current.items)).toBe(2);
  expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY)).items).toHaveLength(1);
});
it('mount mới đọc lại giỏ đã lưu', () => {
  const first = renderHook(() => useCart(), { wrapper: CartProvider });
  act(() => first.result.current.add(item));
  first.unmount();
  const second = renderHook(() => useCart(), { wrapper: CartProvider });
  expect(second.result.current.items).toHaveLength(1);
});
it('useCart ngoài Provider ném lỗi', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(() => renderHook(() => useCart())).toThrow(/CartProvider/);
  vi.restoreAllMocks();
});
