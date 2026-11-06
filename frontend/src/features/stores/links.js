// Link bản đồ luôn do frontend tự dựng từ địa chỉ (không bao giờ dùng URL do backend trả về):
// tiền tố cố định + phần địa chỉ đã mã hóa nên không thể thoát khỏi tham số query.
const MAPS_SEARCH_URL = 'https://www.google.com/maps/search/?api=1&query=';
const NOT_DIAL_CHARS = /[^\d+]/g;

export function buildDirectionsUrl({ name, street, wardName, provinceName }) {
  const address = [name, street, wardName, provinceName].filter(Boolean).join(', ');
  return `${MAPS_SEARCH_URL}${encodeURIComponent(address)}`;
}

export const telHref = (phone) => `tel:${phone.replace(NOT_DIAL_CHARS, '')}`;
