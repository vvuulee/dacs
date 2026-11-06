import { useQuery } from '@tanstack/react-query';
import { getProduct } from '../services/productService';

export const useProduct = (id) =>
  useQuery({ queryKey: ['product', id], queryFn: () => getProduct(id), enabled: Boolean(id) });
