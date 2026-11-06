import { useQuery } from '@tanstack/react-query';
import { getProvinces } from '../services/addressService';

export const useProvinces = () => useQuery({ queryKey: ['provinces'], queryFn: getProvinces });
