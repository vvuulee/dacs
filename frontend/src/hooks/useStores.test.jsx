import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createQueryClient } from '../api/queryClient';
import { getStores } from '../services/storeService';
import { useStores } from './useStores';

vi.mock('../services/storeService', () => ({ getStores: vi.fn() }));
const wrapper = ({ children }) => <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>;

it('truyền filter cho service và trả dữ liệu', async () => {
  getStores.mockResolvedValue([{ id: '1', name: 'A' }]);
  const { result } = renderHook(() => useStores({ provinceId: 'hn', q: 'a' }), { wrapper });
  await waitFor(() => expect(result.current.data).toHaveLength(1));
  expect(getStores).toHaveBeenCalledWith({ provinceId: 'hn', q: 'a' });
});
