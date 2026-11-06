const FAR_FUTURE = '2099-01-01T00:00:00.000Z';
const LONG_PAST = '2000-01-01T00:00:00.000Z';

// Bảng voucher của mock (type/value/max_discount là chi tiết nội bộ, không lộ ra GET /offers).
export const vouchers = [
  { id: 'v1', code: 'CHAO10', title: 'Giảm 10% (tối đa 30.000 ₫)', description: 'Giảm 10% giá trị đơn hàng, tối đa 30.000 ₫.', type: 'percent', value: 10, max_discount: 30000, min_order: 50000, expires_at: FAR_FUTURE, listed: true },
  { id: 'v2', code: 'GIAM20K', title: 'Giảm 20.000 ₫', description: 'Giảm trực tiếp 20.000 ₫ cho đơn từ 100.000 ₫.', type: 'fixed', value: 20000, max_discount: null, min_order: 100000, expires_at: FAR_FUTURE, listed: true },
  { id: 'v3', code: 'FREESHIP', title: 'Miễn phí giao hàng', description: 'Miễn phí giao hàng cho đơn từ 80.000 ₫.', type: 'freeship', value: 0, max_discount: null, min_order: 80000, expires_at: FAR_FUTURE, listed: true },
  { id: 'v4', code: 'COMBO15', title: 'Giảm 15% (tối đa 50.000 ₫)', description: 'Giảm 15% cho đơn từ 150.000 ₫, tối đa 50.000 ₫.', type: 'percent', value: 15, max_discount: 50000, min_order: 150000, expires_at: FAR_FUTURE, listed: true },
  { id: 'v5', code: 'HETHAN', title: 'Giảm 50% (đã hết hạn)', description: 'Mã đã hết hạn, dùng để thử thông báo lỗi.', type: 'percent', value: 50, max_discount: null, min_order: 0, expires_at: LONG_PAST, listed: false },
];
