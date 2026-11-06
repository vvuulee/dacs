import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../features/auth/AuthContext';
import { updateProfile } from '../services/authService';

export function useUpdateProfile() {
  const { setUser } = useAuth();
  return useMutation({ mutationFn: (profile) => updateProfile(profile), onSuccess: (user) => setUser(user) });
}
