import { useQuery } from '@tanstack/react-query';
import { getCategories } from '../services/categoryService';

export const useCategories = () => useQuery({ queryKey: ['categories'], queryFn: getCategories });
