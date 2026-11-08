import { useMutation } from '@tanstack/react-query';
import { validateVoucher } from '../services/voucherService';

export const useApplyVoucher = () => useMutation({ mutationFn: ({ code, items, source }) => validateVoucher({ code, items, source }) });
