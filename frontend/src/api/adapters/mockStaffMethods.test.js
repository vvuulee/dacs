import { MOCK_ORDERS_KEY } from '../../constants';
import { clearSession, saveSession } from '../../features/auth/session';
import { clearStaffSession, saveStaffSession } from '../../features/staff/session';
import { STAFF_DEMO } from '../../mocks/staffStore';
import { createMockAdapter } from './mockAdapter';

// Giờ địa phương: 10:00 ngày 07/11/2026.
const T0 = new Date(2026, 10, 7, 10, 0).getTime();
const YESTERDAY_2359 = new Date(2026, 10, 6, 23, 59).getTime();
let clock;
let adapter;
let rid = 0;
const bacXiu = (quantity = 2) => [{ product_id: 'bac-xiu', size_id: 's', topping_ids: [], note: '', quantity }];
const counter = (over = {}) => ({
  client_request_id: `c-${(rid += 1)}`, service_type: 'dine_in', table: '5',
  items: bacXiu(), payment_method: 'cash', cash_received: 100000, ...over,
});
const online = (over = {}) => ({
  client_request_id: `o-${(rid += 1)}`,
  customer: { name: 'An', phone: '0901234567' },
  address: { province_id: 'hn', ward_id: 'hn-1', street: '12 Lê Lợi' },
  note: '', payment_method: 'cash',
  items: [{ product_id: 'tra-dao', size_id: 'm', topping_ids: ['thach'], note: '', quantity: 2 }],
  ...over,
});
const stored = () => JSON.parse(localStorage.getItem(MOCK_ORDERS_KEY) ?? '[]');

beforeEach(async () => {
  localStorage.clear(); clearSession(); clearStaffSession();
  clock = T0;
  adapter = createMockAdapter(0, () => clock);
  const r = await adapter.staffLogin(STAFF_DEMO);
  saveStaffSession({ token: r.token, expiresAt: r.expires_at });
});
afterEach(() => { clearStaffSession(); clearSession(); });

describe('đơn tại quầy', () => {
  it('tiền mặt: không phí giao, tính tiền thối, hoàn tất ngay', async () => {
    const order = await adapter.staffCreateOrder(counter());
    expect(order).toMatchObject({
      source: 'counter', service_type: 'dine_in', table: '5', status: 'completed', payment_status: 'paid',
      subtotal: 58000, delivery_fee: 0, discount: 0, total: 58000, cash_received: 100000, change: 42000,
      customer: null, address: null, payment: null,
    });
  });
  it.each([
    ['khách đưa thiếu', { cash_received: 50000 }],
    ['thiếu cash_received khi tiền mặt', { cash_received: undefined }],
    ['cash_received không nguyên', { cash_received: 100000.5 }],
    ['tại bàn mà số bàn trống', { table: '  ' }],
    ['số bàn quá 20 ký tự', { table: 'x'.repeat(21) }],
    ['hình thức lạ', { service_type: 'delivery' }],
    ['cách trả lạ', { payment_method: 'wallet' }],
    ['không có món', { items: [] }],
  ])('%s → 422', async (_, over) => {
    await expect(adapter.staffCreateOrder(counter(over))).rejects.toMatchObject({ status: 422 });
  });
  it('mang đi: table null; chuyển khoản không cần cash_received', async () => {
    const order = await adapter.staffCreateOrder(counter({ service_type: 'takeaway', table: '9', payment_method: 'bank_transfer', cash_received: undefined }));
    expect(order).toMatchObject({ service_type: 'takeaway', table: null, payment_method: 'bank_transfer', cash_received: null, change: null });
  });
  it('số bàn được cắt khoảng trắng', async () =>
    expect((await adapter.staffCreateOrder(counter({ table: ' 12 ' }))).table).toBe('12'));
  it('cùng client_request_id → cùng đơn, không lưu thêm', async () => {
    const body = counter();
    const first = await adapter.staffCreateOrder(body);
    const second = await adapter.staffCreateOrder(body);
    expect(second.id).toBe(first.id);
    expect(stored()).toHaveLength(1);
  });
  it('voucher tại quầy: GIAM20K giảm 20.000 (đơn 116.000)', async () => {
    const order = await adapter.staffCreateOrder(counter({ items: bacXiu(4), voucher_code: 'giam20k', cash_received: 200000 }));
    expect(order).toMatchObject({ subtotal: 116000, discount: 20000, total: 96000, voucher_code: 'GIAM20K', change: 104000 });
  });
  it('FREESHIP tại quầy → 422 voucher_invalid', async () =>
    await expect(adapter.staffCreateOrder(counter({ voucher_code: 'FREESHIP' }))).rejects.toMatchObject({ status: 422, code: 'voucher_invalid' }));
});

describe('chuyển trạng thái đơn online', () => {
  it('đi hết các bước', async () => {
    const { id } = await adapter.createOrder(online());
    for (const next of ['preparing', 'delivering', 'delivered']) {
      expect((await adapter.staffUpdateOrderStatus(id, next)).status).toBe(next);
    }
    expect((await adapter.getOrder(id, '0901234567')).status).toBe('delivered');
  });
  it('A huỷ, B giao theo dữ liệu cũ → 409', async () => {
    const { id } = await adapter.createOrder(online());
    await adapter.staffUpdateOrderStatus(id, 'preparing');
    await adapter.staffUpdateOrderStatus(id, 'cancelled');
    await expect(adapter.staffUpdateOrderStatus(id, 'delivering')).rejects.toMatchObject({ status: 409 });
  });
  it('đơn quầy không đổi được trạng thái; id lạ → 404', async () => {
    const { id } = await adapter.staffCreateOrder(counter());
    await expect(adapter.staffUpdateOrderStatus(id, 'delivered')).rejects.toMatchObject({ status: 409 });
    await expect(adapter.staffUpdateOrderStatus('CF00000000', 'preparing')).rejects.toMatchObject({ status: 404 });
  });
});

describe('danh sách và báo cáo hôm nay', () => {
  async function seed() {
    clock = YESTERDAY_2359;
    const old = await adapter.createOrder(online());
    for (const s of ['preparing', 'delivering', 'delivered']) await adapter.staffUpdateOrderStatus(old.id, s);
    clock = T0;
    const placed = await adapter.createOrder(online());
    const cancelled = await adapter.createOrder(online());
    await adapter.staffUpdateOrderStatus(cancelled.id, 'cancelled');
    await adapter.createOrder(online({ payment_method: 'wallet' }));
    await adapter.staffCreateOrder(counter());
    return placed;
  }
  it('online: đơn đã xong của hôm qua không hiện, không đơn quầy, không đơn chờ thanh toán, lọc theo status, mới nhất trước', async () => {
    const placed = await seed();
    const all = await adapter.staffGetOnlineOrders();
    expect(all.map((o) => o.status).sort()).toEqual(['cancelled', 'placed']);
    expect(all.every((o) => o.source === 'online')).toBe(true);
    expect((await adapter.staffGetOnlineOrders({ status: 'placed' })).map((o) => o.id)).toEqual([placed.id]);
  });
  it('online: mới nhất lên đầu', async () => {
    const a = await adapter.createOrder(online());
    clock += 1000;
    const b = await adapter.createOrder(online());
    expect((await adapter.staffGetOnlineOrders()).map((o) => o.id)).toEqual([b.id, a.id]);
  });
  it('today: mọi đơn hôm nay (gồm quầy, huỷ, chờ thanh toán), không có đơn hôm qua', async () => {
    await seed();
    expect(await adapter.staffGetTodayOrders()).toHaveLength(4);
  });
  it('báo cáo: bỏ đơn huỷ, chờ thanh toán và đơn hôm qua', async () => {
    await seed();
    expect(await adapter.staffGetTodayReport()).toEqual({
      date: '2026-11-07', order_count: 2, revenue: 187000, cancelled_count: 1,
      by_source: { counter: { count: 1, revenue: 58000 }, online: { count: 1, revenue: 129000 } },
      by_payment: { cash: 187000, bank_transfer: 0, wallet: 0 },
    });
  });
});

describe('voucher', () => {
  const voucher = (over = {}) => ({
    code: ' tet-2027 ', title: 'Tết', description: '', type: 'percent', value: 10, max_discount: null,
    min_order: 0, expires_at: new Date(2027, 0, 31, 23, 59, 59).toISOString(), listed: true, ...over,
  });
  it('danh sách có đủ trường, kể cả mã hết hạn', async () => {
    const list = await adapter.staffGetVouchers();
    expect(list.find((v) => v.code === 'HETHAN')).toMatchObject({ type: 'percent', value: 50, listed: false });
  });
  it('tạo: chuẩn hoá mã, khách dùng được ngay', async () => {
    const created = await adapter.staffCreateVoucher(voucher());
    expect(created).toMatchObject({ code: 'TET-2027', type: 'percent', value: 10 });
    expect(created.id).toBeTruthy();
    const items = [{ product_id: 'bac-xiu', size_id: 's', topping_ids: [], quantity: 2 }];
    expect(await adapter.validateVoucher({ code: 'TET-2027', items })).toMatchObject({ valid: true, discount: 5800 });
  });
  it('trùng mã → 409', async () =>
    await expect(adapter.staffCreateVoucher(voucher({ code: 'chao10' }))).rejects.toMatchObject({ status: 409 }));
  it.each([
    ['mã sai định dạng', { code: 'a' }],
    ['tiêu đề trống', { title: ' ' }],
    ['tiêu đề quá 80', { title: 'x'.repeat(81) }],
    ['mô tả quá 200', { description: 'x'.repeat(201) }],
    ['percent 0', { value: 0 }],
    ['percent 101', { value: 101 }],
    ['fixed 0', { type: 'fixed', value: 0 }],
    ['freeship có value', { type: 'freeship', value: 5 }],
    ['max_discount ở fixed', { type: 'fixed', value: 1000, max_discount: 500 }],
    ['max_discount 0', { max_discount: 0 }],
    ['min_order âm', { min_order: -1 }],
    ['hạn ở quá khứ', { expires_at: new Date(T0 - 1).toISOString() }],
    ['loại lạ', { type: 'gift' }],
  ])('%s → 422', async (_, over) =>
    await expect(adapter.staffCreateVoucher(voucher(over))).rejects.toMatchObject({ status: 422 }));
  it('xoá: mã không còn dùng được; xoá lần nữa → 404', async () => {
    const id = (await adapter.staffGetVouchers()).find((v) => v.code === 'CHAO10').id;
    expect(await adapter.staffDeleteVoucher(id)).toBeNull();
    const items = [{ product_id: 'bac-xiu', size_id: 's', topping_ids: [], quantity: 2 }];
    expect((await adapter.validateVoucher({ code: 'CHAO10', items })).valid).toBe(false);
    await expect(adapter.staffDeleteVoucher(id)).rejects.toMatchObject({ status: 404 });
  });
});

describe('tồn kho', () => {
  it('tắt món: khách thấy ngay; danh sách nhân viên có cả món hết', async () => {
    expect((await adapter.staffSetAvailability('bac-xiu', false)).is_available).toBe(false);
    expect((await adapter.getProducts()).find((p) => p.id === 'bac-xiu').is_available).toBe(false);
    const list = await adapter.staffGetProducts();
    expect(list.find((p) => p.id === 'cold-brew').is_available).toBe(false);
  });
  it('id lạ → 404; giá trị không phải boolean → 422', async () => {
    await expect(adapter.staffSetAvailability('zzz', false)).rejects.toMatchObject({ status: 404 });
    await expect(adapter.staffSetAvailability('bac-xiu', 'no')).rejects.toMatchObject({ status: 422 });
  });
});

describe('phân quyền', () => {
  it.each([
    ['staffCreateOrder', () => [counter()]],
    ['staffGetOnlineOrders', () => []],
    ['staffUpdateOrderStatus', () => ['CF1', 'preparing']],
    ['staffGetTodayOrders', () => []],
    ['staffGetTodayReport', () => []],
    ['staffGetVouchers', () => []],
    ['staffCreateVoucher', () => [{}]],
    ['staffDeleteVoucher', () => ['v1']],
    ['staffGetProducts', () => []],
    ['staffSetAvailability', () => ['bac-xiu', false]],
  ])('%s với token khách → 403', async (name, args) => {
    const r = await adapter.register({ name: 'An', email: `an${rid += 1}@x.vn`, password: 'matkhau123' });
    saveSession({ token: r.token, expiresAt: r.expires_at });
    saveStaffSession({ token: r.token, expiresAt: r.expires_at });
    await expect(adapter[name](...args())).rejects.toMatchObject({ status: 403 });
  });
});

describe('đơn chưa xong qua nửa đêm', () => {
  it('đơn hôm qua chưa xong vẫn hiện để nhân viên xử lý; đơn hôm qua đã giao thì không', async () => {
    clock = YESTERDAY_2359;
    const open = await adapter.createOrder(online());
    const done = await adapter.createOrder(online());
    for (const s of ['preparing', 'delivering', 'delivered']) await adapter.staffUpdateOrderStatus(done.id, s);
    clock = T0;
    const ids = (await adapter.staffGetOnlineOrders()).map((o) => o.id);
    expect(ids).toContain(open.id);
    expect(ids).not.toContain(done.id);
    expect((await adapter.staffUpdateOrderStatus(open.id, 'preparing')).status).toBe('preparing');
  });
  it('báo cáo hôm nay vẫn không tính đơn hôm qua', async () => {
    clock = YESTERDAY_2359;
    await adapter.createOrder(online());
    clock = T0;
    expect((await adapter.staffGetTodayReport()).order_count).toBe(0);
  });
});
