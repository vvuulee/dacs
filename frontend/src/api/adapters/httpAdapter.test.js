import { clearSession, saveSession } from '../../features/auth/session';
import { createHttpAdapter } from './httpAdapter';

const BASE = 'https://api.x/v1';
const stubFetch = () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};
afterEach(() => { vi.unstubAllGlobals(); clearSession(); });

it('createOrder POST /orders với body', async () => {
  const fetchMock = stubFetch();
  await createHttpAdapter(BASE).createOrder({ a: 1 });
  expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/orders`);
  expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', body: '{"a":1}' });
});
it('getOrder GET /orders/:id?phone=', async () => {
  const fetchMock = stubFetch();
  await createHttpAdapter(BASE).getOrder('CF1', '0901234567');
  expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/orders/CF1?phone=0901234567`);
});
it('getProvinces và getWards gọi đúng đường dẫn', async () => {
  const fetchMock = stubFetch();
  const adapter = createHttpAdapter(BASE);
  await adapter.getProvinces();
  await adapter.getWards('hn');
  expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([`${BASE}/provinces`, `${BASE}/provinces/hn/wards`]);
});
it('http adapter không có simulatePayment', () => expect(createHttpAdapter(BASE).simulatePayment).toBeUndefined());

describe('xác thực', () => {
  const authHeader = (fetchMock) => fetchMock.mock.calls[0][1].headers?.Authorization;
  beforeEach(() => saveSession({ token: 'tk', expiresAt: '2099-01-01T00:00:00.000Z' }));

  it.each([
    ['register', '/auth/register'],
    ['login', '/auth/login'],
    ['forgotPassword', '/auth/forgot-password'],
    ['resetPassword', '/auth/reset-password'],
  ])('%s POST %s và không gắn Bearer dù có token', async (method, path) => {
    const fetchMock = stubFetch();
    await createHttpAdapter(BASE)[method]({ a: 1 });
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}${path}`);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', body: '{"a":1}' });
    expect(authHeader(fetchMock)).toBeUndefined();
  });
  it.each([
    ['logout', [], 'POST', '/auth/logout'],
    ['getMe', [], 'GET', '/me'],
    ['updateMe', [{ name: 'An' }], 'PATCH', '/me'],
    ['changePassword', [{ a: 1 }], 'POST', '/auth/change-password'],
    ['getMyOrders', [], 'GET', '/me/orders'],
  ])('%s %s %s có Bearer', async (method, args, verb, path) => {
    const fetchMock = stubFetch();
    await createHttpAdapter(BASE)[method](...args);
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}${path}`);
    expect(fetchMock.mock.calls[0][1].method).toBe(verb);
    expect(authHeader(fetchMock)).toBe('Bearer tk');
  });
  it('getOrder không phone thì URL không có ?phone=', async () => {
    const fetchMock = stubFetch();
    await createHttpAdapter(BASE).getOrder('CF1', undefined);
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/orders/CF1`);
  });
  it('http adapter không có peekResetToken', () => expect(createHttpAdapter(BASE).peekResetToken).toBeUndefined());
});

describe('cửa hàng, ưu đãi, voucher', () => {
  it('getStores: GET /stores?province=hn&q=mau; bỏ tham số rỗng', async () => {
    const fetchMock = stubFetch();
    const adapter = createHttpAdapter(BASE);
    await adapter.getStores({ provinceId: 'hn', q: 'mau' });
    await adapter.getStores({ provinceId: '', q: '' });
    await adapter.getStores();
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([`${BASE}/stores?province=hn&q=mau`, `${BASE}/stores`, `${BASE}/stores`]);
  });
  it('getOffers: GET /offers', async () => {
    const fetchMock = stubFetch();
    await createHttpAdapter(BASE).getOffers();
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/offers`);
    expect(fetchMock.mock.calls[0][1].method).toBe('GET');
  });
  it('validateVoucher: POST /vouchers/validate với body JSON', async () => {
    const fetchMock = stubFetch();
    await createHttpAdapter(BASE).validateVoucher({ code: 'CHAO10', items: [] });
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/vouchers/validate`);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', body: '{"code":"CHAO10","items":[]}' });
  });
});
