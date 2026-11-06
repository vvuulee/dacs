import { useMutation, useQueryClient } from '@tanstack/react-query';
import { simulatePayment } from '../services/orderService';

export function useSimulatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => simulatePayment(id),
    onSuccess: (order) => queryClient.invalidateQueries({ queryKey: ['order', order.id] }),
  });
}
