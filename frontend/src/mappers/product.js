import { mapList, requireField, requireMoney } from './shared';

const asArray = (value) => (Array.isArray(value) ? value : []);

const toSize = (raw) => ({
  id: String(requireField(raw, 'id')),
  label: requireField(raw, 'label'),
  extraPrice: requireMoney(raw.extra_price ?? 0, 'extra_price'),
});

const toTopping = (raw) => ({
  id: String(requireField(raw, 'id')),
  name: requireField(raw, 'name'),
  price: requireMoney(raw.price, 'price'),
});

export function toProduct(raw) {
  return {
    id: String(requireField(raw, 'id')),
    name: requireField(raw, 'name'),
    description: raw.description ?? '',
    image: raw.image ?? '',
    categoryId: raw.category_id == null ? '' : String(raw.category_id),
    basePrice: requireMoney(raw.base_price, 'base_price'),
    sizes: asArray(raw.sizes).map(toSize),
    toppings: asArray(raw.toppings).map(toTopping),
    isAvailable: raw.is_available ?? true,
  };
}

export const toProducts = (list) => mapList(list, toProduct, 'món');
