import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createQueryClient } from '../api/queryClient';
import { signInStaff } from '../test/staffTestUtils';
import { useOnlineOrders, useSetAvailability, useStaffProducts } from './staff';

vi.mock('../api', async () => (await import('../test/mockApi')).mockApiModule());

let client;
const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

beforeEach(async () => { localStorage.clear(); client = createQueryClient(); await signInStaff(); });

it('useSetAvailability làm mới danh sách món của nhân viên và của khách', async () => {
  client.setQueryData(['products', {}], []);
  const products = renderHook(() => useStaffProducts(), { wrapper });
  await waitFor(() => expect(products.result.current.isSuccess).toBe(true));
  const toggle = renderHook(() => useSetAvailability(), { wrapper });
  await act(() => toggle.result.current.mutateAsync({ id: 'bac-xiu', isAvailable: false }));
  await waitFor(() => expect(client.getQueryData(['staff', 'products']).find((p) => p.id === 'bac-xiu').isAvailable).toBe(false));
  expect(client.getQueryState(['products', {}]).isInvalidated).toBe(true);
});
it('useOnlineOrders tự hỏi lại theo chu kỳ', () => {
  renderHook(() => useOnlineOrders(), { wrapper });
  const query = client.getQueryCache().find({ queryKey: ['staff', 'online-orders'] });
  expect(query.options.refetchInterval).toBe(5000);
});
