import { toOrder, toOrderRequest, toRequestItem } from './order';

const raw = {
  id: 'CF00000001', status: 'placed', payment_method: 'cash', payment_status: 'unpaid',
  customer: { name: 'Nguyễn An', phone: '0901234567' },
  address: { province_name: 'Hà Nội', ward_name: 'Phường Mẫu 1', street: '12 Lê Lợi' },
  note: 'gọi trước',
  items: [{ product_id: 'tra-dao', name: 'Trà đào cam sả', summary: 'Vừa · Thạch trái cây', note: 'ít đá', quantity: 2, unit_price: 57000 }],
  subtotal: 114000, delivery_fee: 15000, total: 129000, created_at: '2026-10-30T03:00:00.000Z', payment: null,
};

it('toOrder map snake_case → camelCase', () =>
  expect(toOrder(raw)).toMatchObject({
    id: 'CF00000001', status: 'placed', paymentMethod: 'cash', paymentStatus: 'unpaid', deliveryFee: 15000, total: 129000,
    address: { provinceName: 'Hà Nội', wardName: 'Phường Mẫu 1', street: '12 Lê Lợi' },
    items: [{ productId: 'tra-dao', unitPrice: 57000, quantity: 2 }], payment: null,
  }));
it('payment → { expiresAt, qrContent }', () =>
  expect(toOrder({ ...raw, payment: { expires_at: '2026-10-30T03:05:00.000Z', qr_content: 'COFFEE-1' } }).payment)
    .toEqual({ expiresAt: '2026-10-30T03:05:00.000Z', qrContent: 'COFFEE-1' }));
it('đơn online không có source → mặc định online/delivery', () =>
  expect(toOrder(raw)).toMatchObject({ source: 'online', serviceType: 'delivery', table: null, cashReceived: null, change: null }));
it('đơn quầy: customer/address null được chấp nhận', () => {
  const counter = { ...raw, status: 'completed', payment_status: 'paid', source: 'counter', service_type: 'dine_in', table: '5', customer: null, address: null, delivery_fee: 0, cash_received: 100000, change: 40000 };
  expect(toOrder(counter)).toMatchObject({ source: 'counter', serviceType: 'dine_in', table: '5', customer: null, address: null, cashReceived: 100000, change: 40000, status: 'completed' });
});
it('đơn online thiếu customer vẫn ném lỗi', () => expect(() => toOrder({ ...raw, customer: null })).toThrow(/customer/));
it('source lạ ném lỗi', () => expect(() => toOrder({ ...raw, source: 'fax' })).toThrow(/fax/));
it('summary và note món thiếu → ""', () => {
  const item = { product_id: 'a', name: 'A', quantity: 1, unit_price: 1000 };
  expect(toOrder({ ...raw, items: [item] }).items[0]).toMatchObject({ summary: '', note: '' });
});
it.each(['id', 'status', 'created_at'])('thiếu %s ném lỗi nêu tên trường', (field) =>
  expect(() => toOrder({ ...raw, [field]: undefined })).toThrow(new RegExp(field)));
it('status lạ ném lỗi nêu giá trị', () => expect(() => toOrder({ ...raw, status: 'teleported' })).toThrow(/teleported/));
it('total âm ném lỗi nêu "total"', () => expect(() => toOrder({ ...raw, total: -1 })).toThrow(/total/));
it('một món thiếu name làm cả đơn lỗi', () =>
  expect(() => toOrder({ ...raw, items: [{ ...raw.items[0], name: undefined }] })).toThrow(/name/));

const args = {
  form: { name: ' Nguyễn An ', phone: '+84 901 234 567', provinceId: 'hn', wardId: 'hn-1', street: ' 12 Lê Lợi ', note: ' gọi trước ', paymentMethod: 'cash' },
  items: [{ productId: 'tra-dao', sizeId: 'm', toppingIds: ['tran-chau', 'thach'], note: ' ít đá ', quantity: 2, unitPrice: 57000, name: 'x', image: '', summary: '', key: 'k' }],
  clientRequestId: 'rid-1',
};
it('toOrderRequest: không chứa trường giá', () => expect(JSON.stringify(toOrderRequest(args))).not.toMatch(/price/i));
it('toOrderRequest: chuẩn hóa SĐT, cắt khoảng trắng, giữ client_request_id', () =>
  expect(toOrderRequest(args)).toMatchObject({
    client_request_id: 'rid-1', customer: { name: 'Nguyễn An', phone: '0901234567' },
    address: { province_id: 'hn', ward_id: 'hn-1', street: '12 Lê Lợi' }, note: 'gọi trước', payment_method: 'cash',
  }));
it('toOrderRequest: items đúng {product_id,size_id,topping_ids sắp xếp,note,quantity}', () =>
  expect(toOrderRequest(args).items).toEqual([
    { product_id: 'tra-dao', size_id: 'm', topping_ids: ['thach', 'tran-chau'], note: 'ít đá', quantity: 2 },
  ]));

describe('giảm giá', () => {
  it('toOrder: thiếu discount → 0 và voucherCode null', () =>
    expect(toOrder(raw)).toMatchObject({ discount: 0, voucherCode: null }));
  it('toOrder: có discount và voucher_code thì map', () =>
    expect(toOrder({ ...raw, discount: 10200, voucher_code: 'CHAO10' })).toMatchObject({ discount: 10200, voucherCode: 'CHAO10' }));
  it.each([-1, 1.5, 'x'])('toOrder discount %s ném lỗi nêu discount', (discount) =>
    expect(() => toOrder({ ...raw, discount })).toThrow(/discount/));
  it('toOrderRequest: có voucherCode → voucher_code; không có/rỗng/null → không có khóa', () => {
    expect(toOrderRequest({ ...args, voucherCode: 'CHAO10' }).voucher_code).toBe('CHAO10');
    expect('voucher_code' in toOrderRequest(args)).toBe(false);
    expect('voucher_code' in toOrderRequest({ ...args, voucherCode: '' })).toBe(false);
    expect('voucher_code' in toOrderRequest({ ...args, voucherCode: null })).toBe(false);
  });
  it('toRequestItem giữ note đã cắt khoảng trắng và topping sắp xếp', () =>
    expect(toRequestItem({ productId: 'a', sizeId: null, toppingIds: ['b', 'a'], note: ' ít đá ', quantity: 1 }))
      .toEqual({ product_id: 'a', size_id: null, topping_ids: ['a', 'b'], note: 'ít đá', quantity: 1 }));
});
