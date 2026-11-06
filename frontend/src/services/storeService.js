import { adapter } from '../api';
import { toStores } from '../mappers/store';

export async function getStores(filter = {}) {
  return toStores(await adapter.getStores(filter));
}
