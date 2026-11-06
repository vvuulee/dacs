import { MOCK_ORDERS_KEY, MOCK_SESSION_TTL_MS, MY_ORDERS_MAX } from '../../constants';
import { clearSession, saveSession } from '../../features/auth/session';
import { createMockAdapter } from './mockAdapter';

const T0 = 1_000_000;
const PHONE = '0901234567';
let clock;
let adapter;
const request = (over = {}) => ({
  client_request_id: `rid-${Math.random()}`,
  customer: { name: 'An', phone: PHONE },
  address: { province_id: 'hn', ward_id: 'hn-1', street: '12 Lê Lợi' },
  note: '', payment_method: 'cash',
  items: [{ product_id: 'tra-dao', size_id: 'm', topping_ids: [], note: '', quantity: 1 }],
  ...over,
});
async function signUp(email) {
  const result = await adapter.register({ name: 'User', email, password: 'matkhau123' });
  return { token: result.token, expiresAt: result.expires_at };
}
const catchErr = (promise) => promise.catch((error) => error);

beforeEach(() => { localStorage.clear(); clearSession(); clock = T0; adapter = createMockAdapter(0, () => clock); });
afterEach(() => clearSession());

it('đặt hàng khi đã đăng nhập: getMyOrders của A có đơn, của B rỗng', async () => {
  const a = await signUp('a@x.vn');
  const b = await signUp('b@x.vn');
  saveSession(a);
  const order = await adapter.createOrder(request());
  expect((await adapter.getMyOrders()).map((o) => o.id)).toEqual([order.id]);
  saveSession(b);
  expect(await adapter.getMyOrders()).toEqual([]);
});
it('đơn khách vãng lai không xuất hiện trong getMyOrders của ai', async () => {
  const a = await signUp('a@x.vn');
  await adapter.createOrder(request());
  saveSession(a);
  expect(await adapter.getMyOrders()).toEqual([]);
});
it('getMyOrders: mới nhất trước và tối đa MY_ORDERS_MAX', async () => {
  saveSession(await signUp('a@x.vn'));
  let lastId;
  for (let i = 0; i <= MY_ORDERS_MAX; i += 1) {
    clock = T0 + i * 1000;
    lastId = (await adapter.createOrder(request())).id;
  }
  const list = await adapter.getMyOrders();
  expect(list).toHaveLength(MY_ORDERS_MAX);
  expect(list[0].id).toBe(lastId);
});
it('getOrder của chủ đơn không cần phone', async () => {
  saveSession(await signUp('a@x.vn'));
  const { id } = await adapter.createOrder(request());
  expect((await adapter.getOrder(id, undefined)).id).toBe(id);
});
it('getOrder của người khác không phone → 404; có phone đúng → xem được', async () => {
  const a = await signUp('a@x.vn');
  const b = await signUp('b@x.vn');
  saveSession(a);
  const { id } = await adapter.createOrder(request());
  saveSession(b);
  await expect(adapter.getOrder(id, undefined)).rejects.toMatchObject({ status: 404 });
  expect((await adapter.getOrder(id, PHONE)).id).toBe(id);
});
it('không đăng nhập, không phone → 404 cùng status và message với sai mã', async () => {
  saveSession(await signUp('a@x.vn'));
  const { id } = await adapter.createOrder(request());
  clearSession();
  const noPhone = await catchErr(adapter.getOrder(id, undefined));
  const wrongId = await catchErr(adapter.getOrder('CF99999999', PHONE));
  expect([noPhone.status, noPhone.message]).toEqual([wrongId.status, wrongId.message]);
  expect(noPhone.status).toBe(404);
});
it('createOrder với token không hợp lệ → 401 và không lưu đơn', async () => {
  saveSession({ token: 'khong-co-trong-bang', expiresAt: '2099-01-01T00:00:00.000Z' });
  await expect(adapter.createOrder(request())).rejects.toMatchObject({ status: 401 });
  expect(JSON.parse(localStorage.getItem(MOCK_ORDERS_KEY) ?? '[]')).toHaveLength(0);
});
it('createOrder với token đã hết hạn → 401', async () => {
  saveSession(await signUp('a@x.vn'));
  clock = T0 + MOCK_SESSION_TTL_MS;
  await expect(adapter.createOrder(request())).rejects.toMatchObject({ status: 401 });
});
it('getOrder với token hết hạn vẫn tra được bằng phone như khách', async () => {
  saveSession(await signUp('a@x.vn'));
  const { id } = await adapter.createOrder(request());
  clock = T0 + MOCK_SESSION_TTL_MS;
  expect((await adapter.getOrder(id, PHONE)).id).toBe(id);
});
it('kết quả thô của đơn không chứa user_id', async () => {
  saveSession(await signUp('a@x.vn'));
  const created = await adapter.createOrder(request());
  const fetched = await adapter.getOrder(created.id, undefined);
  const list = await adapter.getMyOrders();
  expect(JSON.stringify([created, fetched, list])).not.toContain('user_id');
});
it('getMyOrders không token → 401', async () => await expect(adapter.getMyOrders()).rejects.toMatchObject({ status: 401 }));
