import { useMutation } from '@tanstack/react-query';
import { changePassword } from '../services/authService';

export const useChangePassword = () =>
  useMutation({ mutationFn: ({ currentPassword, newPassword }) => changePassword({ currentPassword, newPassword }) });
