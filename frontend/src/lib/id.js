const UUID_BYTES = 16;
const VERSION_4 = 0x40;
const VARIANT_RFC4122 = 0x80;

// crypto.randomUUID chỉ có trong secure context; trang http trên mạng LAN thì không.
export function newRequestId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(UUID_BYTES));
  bytes[6] = (bytes[6] & 0x0f) | VERSION_4;
  bytes[8] = (bytes[8] & 0x3f) | VARIANT_RFC4122;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0'));
  const part = (from, to) => hex.slice(from, to).join('');
  return `${part(0, 4)}-${part(4, 6)}-${part(6, 8)}-${part(8, 10)}-${part(10, 16)}`;
}
