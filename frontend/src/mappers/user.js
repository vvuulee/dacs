import { normalizePhone } from '../lib/phone';
import { requireField } from './shared';

const toAddress = (raw) => ({
  provinceId: String(requireField(raw, 'province_id', 'address.province_id')),
  wardId: String(requireField(raw, 'ward_id', 'address.ward_id')),
  street: requireField(raw, 'street', 'address.street'),
});

export function toUser(raw) {
  return {
    id: String(requireField(raw, 'id')),
    name: requireField(raw, 'name'),
    email: requireField(raw, 'email'),
    phone: raw.phone ?? '',
    address: raw.address ? toAddress(raw.address) : null,
  };
}

export function toAuthResponse(raw) {
  return {
    token: requireField(raw, 'token'),
    expiresAt: requireField(raw, 'expires_at'),
    user: toUser(requireField(raw, 'user')),
  };
}

export function toProfileRequest({ name, phone, provinceId, wardId, street }) {
  const hasAddress = Boolean(provinceId || wardId || street.trim());
  return {
    name: name.trim(),
    phone: phone.trim() ? normalizePhone(phone) : null,
    address: hasAddress ? { province_id: provinceId, ward_id: wardId, street: street.trim() } : null,
  };
}
