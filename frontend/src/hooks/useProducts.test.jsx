import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createQueryClient } from '../api/queryClient';
import { getProduct, getProducts } from '../services/productService';
import { useProduct } from './useProduct';
import { useProducts } from './useProducts';

vi.mock('../services/productService', () => ({ getProducts: vi.fn(), getProduct: vi.fn() }));

const wrapper = ({ children }) => (
  <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>
);

it('useProducts trả data đã map và truyền filter', async () => {
  getProducts.mockResolvedValue([{ id: '1', categoryId: 'c1' }]);
  const { result } = renderHook(() => useProducts({ categoryId: 'c1' }), { wrapper });
  await waitFor(() => expect(result.current.data[0].categoryId).toBe('c1'));
  expect(getProducts).toHaveBeenCalledWith({ categoryId: 'c1' });
});

it('useProduct không thử lại khi 404', async () => {
  getProduct.mockRejectedValue(Object.assign(new Error('x'), { status: 404 }));
  const { result } = renderHook(() => useProduct('zzz'), { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(getProduct).toHaveBeenCalledTimes(1);
});
