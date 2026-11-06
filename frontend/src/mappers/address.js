import { mapList, requireField } from './shared';

const toOption = (raw) => ({ id: String(requireField(raw, 'id')), name: requireField(raw, 'name') });

export const toProvince = toOption;
export const toWard = toOption;
export const toProvinces = (list) => mapList(list, toProvince, 'tỉnh/thành');
export const toWards = (list) => mapList(list, toWard, 'phường/xã');
