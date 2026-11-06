import { useMutation } from '@tanstack/react-query';
import { toOrderRequest } from '../mappers/order';
import { createOrder } from '../services/orderService';

export const useCreateOrder = () =>
  useMutation({
    mutationFn: ({ form, items, clientRequestId, voucherCode }) =>
      createOrder(toOrderRequest({ form, items, clientRequestId, voucherCode })),
  });
