import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../services/productService';

export const useProducts = (filter = {}) =>
  useQuery({ queryKey: ['products', filter], queryFn: () => getProducts(filter) });
