import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createQueryClient } from '../api/queryClient';
import { createOrder } from '../services/orderService';
import { useCreateOrder } from './useCreateOrder';

vi.mock('../services/orderService', () => ({ createOrder: vi.fn() }));
const wrapper = ({ children }) => <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>;
const form = { name: 'An', phone: '0901234567', provinceId: 'hn', wardId: 'hn-1', street: '12 Lê Lợi', note: '', paymentMethod: 'cash' };
const items = [{ productId: 'tra-dao', sizeId: 'm', toppingIds: [], note: '', quantity: 1, unitPrice: 1, name: 'x', image: '', summary: '', key: 'k' }];

async function submit(variables) {
  createOrder.mockResolvedValue({ id: 'CF1' });
  const { result } = renderHook(() => useCreateOrder(), { wrapper });
  await act(async () => { result.current.mutate(variables); });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return createOrder.mock.calls.at(-1)[0];
}

it('có voucherCode → request có voucher_code', async () =>
  expect((await submit({ form, items, clientRequestId: 'r1', voucherCode: 'CHAO10' })).voucher_code).toBe('CHAO10'));
it('không có voucherCode → request không có khóa voucher_code', async () =>
  expect('voucher_code' in (await submit({ form, items, clientRequestId: 'r2' }))).toBe(false));
