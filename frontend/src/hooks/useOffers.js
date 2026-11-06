import { useQuery } from '@tanstack/react-query';
import { getOffers } from '../services/offerService';

export const useOffers = () => useQuery({ queryKey: ['offers'], queryFn: getOffers });
