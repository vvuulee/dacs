import { MOCK_ORDERS_KEY } from '../../constants';
import { createMockAdapter } from './mockAdapter';

const t0 = 1_000_000;
let clock;
let adapter;
const request = (over = {}) => ({
  client_request_id: 'rid-1',
  customer: { name: 'Nguyễn An', phone: '0901234567' },
  address: { province_id: 'hn', ward_id: 'hn-1', street: '12 Lê Lợi' },
  note: '',
  payment_method: 'cash',
  items: [{ product_id: 'tra-dao', size_id: 'm', topping_ids: ['thach'], note: 'ít đá', quantity: 2 }],
  ...over,
});
const item = (over) => ({ ...request().items[0], ...over });

beforeEach(() => {
  localStorage.clear();
  clock = t0;
  adapter = createMockAdapter(0, () => clock);
});

it('createOrder tiền mặt: giá do mock tính từ danh mục', async () => {
  const order = await adapter.createOrder(request());
  expect(order).toMatchObject({
    status: 'placed', payment_status: 'unpaid', payment: null, subtotal: 114000, delivery_fee: 15000, total: 129000,
    address: { province_name: 'Hà Nội', ward_name: 'Phường Mẫu 1', street: '12 Lê Lợi' },
  });
  expect(order.id).toMatch(/^CF\d{8}$/);
  expect(order.items[0]).toEqual({ product_id: 'tra-dao', name: 'Trà đào cam sả', summary: 'Vừa · Thạch trái cây', note: 'ít đá', quantity: 2, unit_price: 57000 });
});
it('cùng client_request_id trả cùng id và chỉ lưu 1 đơn', async () => {
  const first = await adapter.createOrder(request());
  const second = await adapter.createOrder(request());
  expect(second.id).toBe(first.id);
  expect(JSON.parse(localStorage.getItem(MOCK_ORDERS_KEY))).toHaveLength(1);
});
it.each([
  ['product_id lạ', { items: [item({ product_id: 'zzz' })] }],
  ['items rỗng', { items: [] }],
  ['size lạ', { items: [item({ size_id: 'xl' })] }],
  ['topping lạ', { items: [item({ topping_ids: ['zzz'] })] }],
  ['quantity 0', { items: [item({ quantity: 0 })] }],
  ['tỉnh lạ', { address: { province_id: 'zzz', ward_id: 'hn-1', street: '12 Lê Lợi' } }],
  ['phương thức lạ', { payment_method: 'crypto' }],
])('%s → ApiError 422', async (_, over) =>
  await expect(adapter.createOrder(request(over))).rejects.toMatchObject({ status: 422 }));
it('createOrder online: awaiting_payment/pending và payment có hạn + qr_content', async () => {
  const order = await adapter.createOrder(request({ payment_method: 'bank_transfer' }));
  expect(order).toMatchObject({ status: 'awaiting_payment', payment_status: 'pending' });
  expect(order.payment).toEqual({ expires_at: new Date(t0 + 300000).toISOString(), qr_content: `COFFEE-${order.id}-129000` });
});
it('getOrder khớp SĐT dù gõ "+84 901 234 567"', async () => {
  const { id } = await adapter.createOrder(request());
  expect((await adapter.getOrder(id, '+84 901 234 567')).id).toBe(id);
});
it('sai SĐT và sai mã cho cùng status 404 và cùng message', async () => {
  const { id } = await adapter.createOrder(request());
  const wrongPhone = await adapter.getOrder(id, '0911111111').catch((e) => e);
  const wrongId = await adapter.getOrder('CF99999999', '0901234567').catch((e) => e);
  expect([wrongPhone.status, wrongPhone.message]).toEqual([404, 'Không tìm thấy đơn']);
  expect([wrongId.status, wrongId.message]).toEqual([wrongPhone.status, wrongPhone.message]);
});
it('trạng thái không tự tiến triển theo đồng hồ', async () => {
  const { id } = await adapter.createOrder(request());
  clock = t0 + 10 ** 9;
  expect((await adapter.getOrder(id, '0901234567')).status).toBe('placed');
});
it('đơn online trả về source/service_type mặc định', async () => {
  const order = await adapter.createOrder(request());
  expect(order).toMatchObject({ source: 'online', service_type: 'delivery', table: null, cash_received: null, change: null });
});
it('simulatePayment: placed, payment null, paid; sau đó vẫn placed', async () => {
  const { id } = await adapter.createOrder(request({ payment_method: 'wallet' }));
  clock = t0 + 60000;
  expect(await adapter.simulatePayment(id)).toMatchObject({ status: 'placed', payment_status: 'paid', payment: null });
  clock = t0 + 10 ** 9;
  expect((await adapter.getOrder(id, '0901234567')).status).toBe('placed');
});
it('simulatePayment hai lần vẫn ổn (idempotent)', async () => {
  const { id } = await adapter.createOrder(request({ payment_method: 'wallet' }));
  await adapter.simulatePayment(id);
  expect((await adapter.simulatePayment(id)).payment_status).toBe('paid');
});
it('simulatePayment quá hạn → 409; đơn tiền mặt → 409; id lạ → 404', async () => {
  const online = await adapter.createOrder(request({ payment_method: 'wallet' }));
  const cash = await adapter.createOrder(request({ client_request_id: 'rid-2' }));
  clock = t0 + 300000;
  await expect(adapter.simulatePayment(online.id)).rejects.toMatchObject({ status: 409 });
  await expect(adapter.simulatePayment(cash.id)).rejects.toMatchObject({ status: 409 });
  await expect(adapter.simulatePayment('CF99999999')).rejects.toMatchObject({ status: 404 });
});
