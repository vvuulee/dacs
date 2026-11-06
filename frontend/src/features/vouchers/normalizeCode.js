import { VOUCHER_CODE_MAX, VOUCHER_CODE_MIN } from '../../constants';

const WHITESPACE = /\s+/g;
const CODE_CHARS = /^[A-Z0-9-]+$/;

export const normalizeVoucherCode = (input) => String(input ?? '').replace(WHITESPACE, '').toUpperCase();

export const isVoucherCode = (code) =>
  code.length >= VOUCHER_CODE_MIN && code.length <= VOUCHER_CODE_MAX && CODE_CHARS.test(code);
