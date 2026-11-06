import { useMutation } from '@tanstack/react-query';
import { resetPassword } from '../services/authService';

export const useResetPassword = () =>
  useMutation({ mutationFn: ({ token, newPassword }) => resetPassword({ token, newPassword }) });
