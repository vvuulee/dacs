import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { POLL_INTERVAL_MS } from '../constants';
import * as staff from '../services/staffService';

// Mọi query của nhân viên có tiền tố ['staff'] để đăng xuất xoá sạch một lần.
const KEYS = {
  products: ['staff', 'products'],
  onlineOrders: ['staff', 'online-orders'],
  todayOrders: ['staff', 'today-orders'],
  todayReport: ['staff', 'today-report'],
  vouchers: ['staff', 'vouchers'],
};

export const useStaffProducts = () => useQuery({ queryKey: KEYS.products, queryFn: staff.getProducts });
export const useOnlineOrders = () =>
  useQuery({ queryKey: KEYS.onlineOrders, queryFn: () => staff.getOnlineOrders(), refetchInterval: POLL_INTERVAL_MS });
export const useTodayOrders = () => useQuery({ queryKey: KEYS.todayOrders, queryFn: staff.getTodayOrders });
export const useTodayReport = () => useQuery({ queryKey: KEYS.todayReport, queryFn: staff.getTodayReport });
export const useStaffVouchers = () => useQuery({ queryKey: KEYS.vouchers, queryFn: staff.getVouchers });

// Sau khi ghi: làm mới dữ liệu nhân viên và các danh sách khách dùng chung (món, ưu đãi).
function useStaffMutation(mutationFn, extraKeys = []) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: () => Promise.all([['staff'], ...extraKeys].map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
}

export const useCreateCounterOrder = () => useStaffMutation((request) => staff.createCounterOrder(request));
export const useUpdateOrderStatus = () => useStaffMutation(({ id, status }) => staff.updateOrderStatus(id, status));
export const useCreateVoucher = () => useStaffMutation((request) => staff.createVoucher(request), [['offers']]);
export const useDeleteVoucher = () => useStaffMutation((id) => staff.deleteVoucher(id), [['offers']]);
export const useSetAvailability = () =>
  useStaffMutation(({ id, isAvailable }) => staff.setAvailability(id, isAvailable), [['products'], ['product']]);
export const useStaffChangePassword = () =>
  useMutation({ mutationFn: ({ currentPassword, newPassword }) => staff.changePassword({ currentPassword, newPassword }) });
