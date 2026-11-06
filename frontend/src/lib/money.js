const vndFormat = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

export function formatVnd(amount) {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new RangeError(`Số tiền VND phải là số nguyên không âm, nhận được: ${amount}`);
  }
  return vndFormat.format(amount);
}
