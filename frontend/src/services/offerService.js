import { adapter } from '../api';
import { toOffers } from '../mappers/offer';

export async function getOffers() {
  return toOffers(await adapter.getOffers());
}
