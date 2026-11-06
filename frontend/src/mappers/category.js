import { mapList, requireField } from './shared';

export function toCategory(raw) {
  return {
    id: String(requireField(raw, 'id')),
    name: requireField(raw, 'name'),
    image: raw.image ?? '',
  };
}

export const toCategories = (list) => mapList(list, toCategory, 'danh mục');
