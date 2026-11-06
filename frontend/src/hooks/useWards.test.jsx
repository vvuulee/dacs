import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createQueryClient } from '../api/queryClient';
import { getWards } from '../services/addressService';
import { useWards } from './useWards';

vi.mock('../services/addressService', () => ({ getWards: vi.fn(), getProvinces: vi.fn() }));
const wrapper = ({ children }) => <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>;
beforeEach(() => vi.clearAllMocks());

it('useWards("") không gọi service', () => {
  renderHook(() => useWards(''), { wrapper });
  expect(getWards).not.toHaveBeenCalled();
});
it('useWards("hn") trả danh sách phường', async () => {
  getWards.mockResolvedValue([{ id: 'hn-1', name: 'Phường Mẫu 1' }]);
  const { result } = renderHook(() => useWards('hn'), { wrapper });
  await waitFor(() => expect(result.current.data).toHaveLength(1));
  expect(getWards).toHaveBeenCalledWith('hn');
});
