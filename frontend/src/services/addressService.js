import { adapter } from '../api';
import { toProvinces, toWards } from '../mappers/address';

export async function getProvinces() {
  return toProvinces(await adapter.getProvinces());
}

export async function getWards(provinceId) {
  return toWards(await adapter.getWards(provinceId));
}
