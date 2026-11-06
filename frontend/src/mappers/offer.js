import { mapList, requireField, requireMoney } from './shared';

export function toOffer(raw) {
  return {
    id: String(requireField(raw, 'id')),
    title: requireField(raw, 'title'),
    description: raw.description ?? '',
    code: requireField(raw, 'code'),
    minOrder: raw.min_order == null ? null : requireMoney(raw.min_order, 'min_order'),
    expiresAt: raw.expires_at ?? null,
  };
}

export const toOffers = (list) => mapList(list, toOffer, 'ưu đãi');
