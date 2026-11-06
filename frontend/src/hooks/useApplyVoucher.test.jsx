import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createQueryClient } from '../api/queryClient';
import { validateVoucher } from '../services/voucherService';
import { useApplyVoucher } from './useApplyVoucher';

vi.mock('../services/voucherService', () => ({ validateVoucher: vi.fn() }));
const wrapper = ({ children }) => <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>;

it('mutate({code, items}) gọi service và trả kết quả', async () => {
  validateVoucher.mockResolvedValue({ valid: true, code: 'CHAO10', title: 'T', discount: 1 });
  const { result } = renderHook(() => useApplyVoucher(), { wrapper });
  await act(async () => { result.current.mutate({ code: 'CHAO10', items: [] }); });
  await waitFor(() => expect(result.current.data).toMatchObject({ valid: true, discount: 1 }));
  expect(validateVoucher).toHaveBeenCalledWith({ code: 'CHAO10', items: [] });
});
