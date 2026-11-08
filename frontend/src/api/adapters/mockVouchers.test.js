import { MOCK_ORDERS_KEY } from '../../constants';
import { clearSession, saveSession } from '../../features/auth/session';
import { createMockAdapter } from './mockAdapter';
import { saveVouchers } from '../../mocks/voucherStore';
import { setAvailability } from '../../mocks/availabilityStore';

const NOW = Date.parse('2026-10-30T00:00:00Z');
const PHONE = '0901234567';
let clock;
let adapter;
const spaced = (text) => text.replace(/\s/g, ' ');
// 2 × (45.000 + 6.000 size vừa) = 102.000
const items = [{ product_id: 'tra-dao', size_id: 'm', topping_ids: [], quantity: 2 }];
const request = (over = {}) => ({
  client_request_id: `rid-${Math.random()}`,
  customer: { name: 'An', phone: PHONE },
  address: { province_id: 'hn', ward_id: 'hn-1', street: '12 Lê Lợi' },
  note: '', payment_method: 'cash',
  items: items.map((item) => ({ ...item, note: '' })),
  ...over,
});
const storedOrders = () => JSON.parse(localStorage.getItem(MOCK_ORDERS_KEY) ?? '[]');

beforeEach(() => { localStorage.clear(); clearSession(); clock = NOW; adapter = createMockAdapter(0, () => clock); });
afterEach(() => clearSession());

describe('cửa hàng', () => {
  it('không lọc → 9 cửa hàng; lọc hn → 3', async () => {
    expect(await adapter.getStores()).toHaveLength(9);
    expect(await adapter.getStores({ provinceId: 'hn' })).toHaveLength(3);
  });
  it('tìm không dấu "cua hang mau 1" khớp đúng một cửa hàng; q chỉ khoảng trắng → đủ 9', async () => {
    expect((await adapter.getStores({ q: 'cua hang mau 1' })).map((s) => s.name)).toEqual(['Cửa hàng Mẫu 1']);
    expect(await adapter.getStores({ q: '   ' })).toHaveLength(9);
  });
  it('lọc tỉnh + tìm tên chỉ trả cửa hàng thuộc tỉnh đó', async () => {
    expect((await adapter.getStores({ provinceId: 'hn', q: 'mau 2' })).map((s) => s.province_id)).toEqual(['hn']);
    expect(await adapter.getStores({ provinceId: 'hn', q: 'mau 4' })).toEqual([]);
  });
});

describe('ưu đãi', () => {
  it('4 mã đang hiệu lực, không có HETHAN, không rò type/value/max_discount/listed', async () => {
    const list = await adapter.getOffers();
    expect(list.map((o) => o.code).sort()).toEqual(['CHAO10', 'COMBO15', 'FREESHIP', 'GIAM20K']);
    expect(JSON.stringify(list)).not.toMatch(/type|value|max_discount|listed|HETHAN/);
    expect(list[0]).toEqual(expect.objectContaining({ id: expect.any(String), title: expect.any(String), min_order: expect.any(Number) }));
  });
  it('đồng hồ vượt hạn thì các voucher biến mất khỏi danh sách', async () => {
    clock = Date.parse('2100-01-01T00:00:00Z');
    expect(await adapter.getOffers()).toEqual([]);
  });
});

describe('kiểm tra mã', () => {
  it('CHAO10 với 102.000 → valid:true, giảm 10.200', async () =>
    expect(await adapter.validateVoucher({ code: 'CHAO10', items })).toMatchObject({ valid: true, code: 'CHAO10', discount: 10200 }));
  it('nhận mã chữ thường', async () =>
    expect(await adapter.validateVoucher({ code: 'chao10', items })).toMatchObject({ valid: true, discount: 10200 }));
  it('mã lạ / HETHAN → valid:false đúng lý do', async () => {
    expect(await adapter.validateVoucher({ code: 'XYZ999', items })).toEqual({ valid: false, reason: 'Mã giảm giá không tồn tại' });
    expect(await adapter.validateVoucher({ code: 'HETHAN', items })).toEqual({ valid: false, reason: 'Mã giảm giá đã hết hạn' });
  });
  it('dưới đơn tối thiểu → valid:false nêu số tiền tối thiểu', async () => {
    const small = [{ product_id: 'tra-dao', size_id: 's', topping_ids: [], quantity: 1 }]; // 45.000
    const result = await adapter.validateVoucher({ code: 'GIAM20K', items: small });
    expect(result.valid).toBe(false);
    expect(spaced(result.reason)).toBe('Đơn hàng cần từ 100.000 ₫ để dùng mã này');
  });
  it('items rỗng hoặc món lạ → ApiError 422', async () => {
    await expect(adapter.validateVoucher({ code: 'CHAO10', items: [] })).rejects.toMatchObject({ status: 422 });
    await expect(adapter.validateVoucher({ code: 'CHAO10', items: [{ product_id: 'zzz', size_id: null, topping_ids: [], quantity: 1 }] }))
      .rejects.toMatchObject({ status: 422 });
  });
});

describe('đặt hàng có mã', () => {
  it('CHAO10: discount 10.200, voucher_code "CHAO10", total = 102.000 + 15.000 − 10.200', async () => {
    const order = await adapter.createOrder(request({ voucher_code: 'chao10' }));
    expect(order).toMatchObject({ subtotal: 102000, delivery_fee: 15000, discount: 10200, voucher_code: 'CHAO10', total: 106800 });
  });
  it.each(['CHAO10', 'GIAM20K', 'FREESHIP'])('mức giảm xem trước bằng mức giảm trong đơn (%s) và tổng không âm', async (code) => {
    const preview = await adapter.validateVoucher({ code, items });
    const order = await adapter.createOrder(request({ voucher_code: code }));
    expect(order.discount).toBe(preview.discount);
    expect(order.total).toBe(order.subtotal + order.delivery_fee - order.discount);
    expect(order.total).toBeGreaterThanOrEqual(0);
  });
  it('không mã: discount 0, voucher_code null, total = subtotal + delivery_fee', async () => {
    const order = await adapter.createOrder(request());
    expect(order).toMatchObject({ discount: 0, voucher_code: null, total: 117000 });
  });
  it('HETHAN → ApiError 422, code "voucher_invalid", message là lý do, và không lưu đơn', async () => {
    await expect(adapter.createOrder(request({ voucher_code: 'HETHAN' })))
      .rejects.toMatchObject({ status: 422, code: 'voucher_invalid', message: 'Mã giảm giá đã hết hạn' });
    expect(storedOrders()).toHaveLength(0);
  });
  it('mã dưới đơn tối thiểu → 422 voucher_invalid', async () => {
    const small = request({ voucher_code: 'GIAM20K', items: [{ product_id: 'tra-dao', size_id: 's', topping_ids: [], note: '', quantity: 1 }] });
    await expect(adapter.createOrder(small)).rejects.toMatchObject({ status: 422, code: 'voucher_invalid' });
  });
  it('sau khi bị từ chối vì mã, đặt lại KHÔNG mã với cùng client_request_id tạo đơn bình thường', async () => {
    const rid = 'rid-giong-nhau';
    await expect(adapter.createOrder(request({ client_request_id: rid, voucher_code: 'HETHAN' }))).rejects.toMatchObject({ status: 422 });
    const order = await adapter.createOrder(request({ client_request_id: rid }));
    expect(order).toMatchObject({ discount: 0, voucher_code: null });
    expect(storedOrders()).toHaveLength(1);
  });
  it('getOrder và getMyOrders trả discount/voucher_code của đơn', async () => {
    const reg = await adapter.register({ name: 'User', email: 'a@x.vn', password: 'matkhau123' });
    saveSession({ token: reg.token, expiresAt: reg.expires_at });
    const created = await adapter.createOrder(request({ voucher_code: 'CHAO10' }));
    expect(await adapter.getOrder(created.id, PHONE)).toMatchObject({ discount: 10200, voucher_code: 'CHAO10' });
    expect((await adapter.getMyOrders())[0]).toMatchObject({ discount: 10200, voucher_code: 'CHAO10' });
  });
});

describe('voucher và còn hàng lưu trong localStorage', () => {
  it('xoá hết voucher → getOffers rỗng và mã cũ không tồn tại', async () => {
    saveVouchers([]);
    expect(await adapter.getOffers()).toEqual([]);
    expect(await adapter.validateVoucher({ code: 'CHAO10', items })).toEqual({ valid: false, reason: 'Mã giảm giá không tồn tại' });
  });
  it('đặt hàng đọc voucher từ store', async () => {
    saveVouchers([]);
    await expect(adapter.createOrder(request({ voucher_code: 'CHAO10' }))).rejects.toMatchObject({ status: 422 });
  });
  it('validate với source counter từ chối freeship', async () => {
    expect(await adapter.validateVoucher({ code: 'FREESHIP', items, source: 'counter' }))
      .toEqual({ valid: false, reason: 'Mã chỉ áp dụng cho đơn giao hàng' });
  });
  it('món bị tắt: khách thấy is_available false ở danh sách và chi tiết', async () => {
    setAvailability('bac-xiu', false);
    expect((await adapter.getProducts()).find((p) => p.id === 'bac-xiu').is_available).toBe(false);
    expect((await adapter.getProduct('bac-xiu')).is_available).toBe(false);
  });
  it('đặt món đã tắt → 422 "Món Bạc xỉu đã hết"', async () => {
    setAvailability('bac-xiu', false);
    const order = request({ items: [{ product_id: 'bac-xiu', size_id: 'm', topping_ids: [], note: '', quantity: 1 }] });
    await expect(adapter.createOrder(order)).rejects.toMatchObject({ status: 422, message: 'Món Bạc xỉu đã hết' });
  });
  it('món hết sẵn trong dữ liệu (cold-brew) → 422', async () => {
    const order = request({ items: [{ product_id: 'cold-brew', size_id: 'm', topping_ids: [], note: '', quantity: 1 }] });
    await expect(adapter.createOrder(order)).rejects.toMatchObject({ status: 422, message: 'Món Cold brew cam sả đã hết' });
  });
});
