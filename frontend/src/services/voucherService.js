import { adapter } from '../api';
import { toVoucherRequest, toVoucherResult } from '../mappers/voucher';

export async function validateVoucher({ code, items, source }) {
  return toVoucherResult(await adapter.validateVoucher(toVoucherRequest({ code, items, source })));
}
