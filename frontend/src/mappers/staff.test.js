import { mapList } from './shared';
import { toCounterOrderRequest, toDailyReport, toStaff, toStaffAuth, toStaffVoucher, toVoucherCreateRequest } from './staff';

const staff = { id: 's1', name: 'Nhân viên Mẫu', email: 'nv@x.vn', role: 'staff' };

it('toStaff', () => expect(toStaff(staff)).toEqual(staff));
it('toStaff thiếu email ném lỗi', () => expect(() => toStaff({ ...staff, email: undefined })).toThrow(/email/));
it('toStaffAuth', () =>
  expect(toStaffAuth({ token: 't', expires_at: '2099-01-01T00:00:00.000Z', staff })).toEqual({ token: 't', expiresAt: '2099-01-01T00:00:00.000Z', staff }));
it('toStaffAuth thiếu token ném lỗi', () => expect(() => toStaffAuth({ expires_at: 'x', staff })).toThrow(/token/));

const rawVoucher = { id: 'v1', code: 'CHAO10', title: 'T', description: 'D', type: 'percent', value: 10, max_discount: 30000, min_order: 50000, expires_at: '2099-01-01T00:00:00.000Z', listed: true };
it('toStaffVoucher', () =>
  expect(toStaffVoucher(rawVoucher)).toEqual({ id: 'v1', code: 'CHAO10', title: 'T', description: 'D', type: 'percent', value: 10, maxDiscount: 30000, minOrder: 50000, expiresAt: '2099-01-01T00:00:00.000Z', listed: true }));
it('toStaffVoucher: thiếu code ném lỗi; loại lạ ném lỗi', () => {
  expect(() => toStaffVoucher({ ...rawVoucher, code: undefined })).toThrow(/code/);
  expect(() => toStaffVoucher({ ...rawVoucher, type: 'gift' })).toThrow(/gift/);
});
it('toDailyReport', () =>
  expect(toDailyReport({
    date: '2026-11-07', order_count: 2, revenue: 187000, cancelled_count: 1,
    by_source: { counter: { count: 1, revenue: 58000 }, online: { count: 1, revenue: 129000 } },
    by_payment: { cash: 187000, bank_transfer: 0, wallet: 0 },
  })).toEqual({
    date: '2026-11-07', orderCount: 2, revenue: 187000, cancelledCount: 1,
    bySource: { counter: { count: 1, revenue: 58000 }, online: { count: 1, revenue: 129000 } },
    byPayment: { cash: 187000, bankTransfer: 0, wallet: 0 },
  }));
const line = { productId: 'bac-xiu', sizeId: 's', toppingIds: [], note: ' ít ngọt ', quantity: 2, unitPrice: 29000, key: 'k', name: 'Bạc xỉu', image: '', summary: '' };
it('toCounterOrderRequest tiền mặt tại bàn: cắt số bàn, có cash_received, không gửi giá', () => {
  const req = toCounterOrderRequest({ items: [line], serviceType: 'dine_in', table: ' 5 ', voucherCode: 'GIAM20K', paymentMethod: 'cash', cashReceived: 100000, clientRequestId: 'r1' });
  expect(req).toEqual({
    client_request_id: 'r1', service_type: 'dine_in', table: '5', payment_method: 'cash', cash_received: 100000, voucher_code: 'GIAM20K',
    items: [{ product_id: 'bac-xiu', size_id: 's', topping_ids: [], note: 'ít ngọt', quantity: 2 }],
  });
  expect(JSON.stringify(req)).not.toMatch(/price/i);
});
it('toCounterOrderRequest mang đi chuyển khoản: table null, không cash_received, không voucher', () => {
  const req = toCounterOrderRequest({ items: [line], serviceType: 'takeaway', table: '5', voucherCode: null, paymentMethod: 'bank_transfer', cashReceived: 999, clientRequestId: 'r2' });
  expect(req.table).toBeNull();
  expect(req).not.toHaveProperty('cash_received');
  expect(req).not.toHaveProperty('voucher_code');
});
it('toVoucherCreateRequest: hạn 23:59:59 giờ địa phương, số từ chuỗi, freeship value 0, max_discount chỉ cho percent', () => {
  const form = { code: ' tet ', title: ' Tết ', description: ' ', type: 'percent', value: '10', maxDiscount: '', minOrder: '0', expiresOn: '2027-01-31', listed: true };
  expect(toVoucherCreateRequest(form)).toEqual({
    code: 'TET', title: 'Tết', description: '', type: 'percent', value: 10, max_discount: null, min_order: 0,
    expires_at: new Date(2027, 0, 31, 23, 59, 59).toISOString(), listed: true,
  });
  expect(toVoucherCreateRequest({ ...form, type: 'freeship', value: '', maxDiscount: '5000' })).toMatchObject({ value: 0, max_discount: null });
  expect(toVoucherCreateRequest({ ...form, maxDiscount: '30.000' }).max_discount).toBe(30000);
});
it('mapList bỏ voucher hỏng', () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  expect(mapList([rawVoucher, { ...rawVoucher, code: undefined }], toStaffVoucher, 'voucher')).toHaveLength(1);
  vi.restoreAllMocks();
});
