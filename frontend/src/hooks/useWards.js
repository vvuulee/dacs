import { useQuery } from '@tanstack/react-query';
import { getWards } from '../services/addressService';

export const useWards = (provinceId) =>
  useQuery({ queryKey: ['wards', provinceId], queryFn: () => getWards(provinceId), enabled: Boolean(provinceId) });
