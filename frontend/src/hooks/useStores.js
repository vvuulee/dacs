import { useQuery } from '@tanstack/react-query';
import { getStores } from '../services/storeService';

export const useStores = (filter = {}) => useQuery({ queryKey: ['stores', filter], queryFn: () => getStores(filter) });
