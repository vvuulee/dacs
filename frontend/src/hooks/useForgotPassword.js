import { useMutation } from '@tanstack/react-query';
import { forgotPassword } from '../services/authService';

export const useForgotPassword = () => useMutation({ mutationFn: (email) => forgotPassword(email) });
