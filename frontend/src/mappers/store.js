import { mapList, requireField } from './shared';

export function toStore(raw) {
  return {
    id: String(requireField(raw, 'id')),
    name: requireField(raw, 'name'),
    street: raw.street ?? '',
    wardName: raw.ward_name ?? '',
    provinceId: raw.province_id == null ? '' : String(raw.province_id),
    provinceName: raw.province_name ?? '',
    phone: raw.phone ?? '',
    openingHours: raw.opening_hours ?? '',
  };
}

export const toStores = (list) => mapList(list, toStore, 'cửa hàng');
