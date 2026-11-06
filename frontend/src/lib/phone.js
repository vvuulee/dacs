const SEPARATORS = /[\s.-]/g;
const VN_MOBILE = /^0[35789]\d{8}$/;

export function normalizePhone(input) {
  const compact = String(input ?? '').replace(SEPARATORS, '');
  return compact.startsWith('+84') ? `0${compact.slice(3)}` : compact;
}

export const isValidPhone = (input) => VN_MOBILE.test(normalizePhone(input));
