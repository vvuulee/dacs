import { adapter } from '../api';
import { toCategories } from '../mappers/category';

export async function getCategories() {
  return toCategories(await adapter.getCategories());
}
