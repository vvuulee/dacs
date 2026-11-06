import { clearSession, saveSession } from '../features/auth/session';
import { ApiError, request, setUnauthorizedHandler } from './client';

const okJson = (body) => ({ ok: true, status: 200, json: async () => body });
afterEach(() => vi.unstubAllGlobals());

it('trả JSON khi ok', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson([{ id: 1 }])));
  await expect(request('/categories', { baseUrl: 'https://api.x/v1' })).resolves.toEqual([{ id: 1 }]);
});
it('404 → ApiError status 404', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
  await expect(request('/products/9', { baseUrl: '/api' })).rejects.toMatchObject({ name: 'ApiError', status: 404 });
});
it('fetch ném lỗi → ApiError status 0', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  await expect(request('/x', { baseUrl: '/api' })).rejects.toMatchObject({ status: 0 });
});
it('body không phải JSON → ApiError', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => { throw new SyntaxError('x'); } }));
  await expect(request('/x', { baseUrl: '/api' })).rejects.toBeInstanceOf(ApiError);
});
it('gắn params vào query string, bỏ params rỗng', async () => {
  const fetchMock = vi.fn().mockResolvedValue(okJson([]));
  vi.stubGlobal('fetch', fetchMock);
  await request('/products', { baseUrl: 'https://api.x/v1', params: { category: 'tra', q: '' } });
  expect(fetchMock.mock.calls[0][0]).toBe('https://api.x/v1/products?category=tra');
});

it('request POST gửi body JSON kèm header content-type', async () => {
  const fetchMock = vi.fn().mockResolvedValue(okJson({ id: 'CF1' }));
  vi.stubGlobal('fetch', fetchMock);
  await request('/orders', { baseUrl: '/api', method: 'POST', body: { a: 1 } });
  const [, init] = fetchMock.mock.calls[0];
  expect(init).toMatchObject({ method: 'POST', body: '{"a":1}', headers: { 'Content-Type': 'application/json' } });
});
it('request GET mặc định không gửi body', async () => {
  const fetchMock = vi.fn().mockResolvedValue(okJson([]));
  vi.stubGlobal('fetch', fetchMock);
  await request('/x', { baseUrl: '/api' });
  expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'GET' });
  expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
});

describe('xác thực', () => {
  const stub = (response) => {
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };
  const headers = (fetchMock) => fetchMock.mock.calls[0][1].headers;
  beforeEach(() => saveSession({ token: 'tk-1', expiresAt: '2099-01-01T00:00:00.000Z' }));
  afterEach(() => { setUnauthorizedHandler(null); clearSession(); });

  it('gắn Authorization Bearer khi có token', async () => {
    const fetchMock = stub(okJson({}));
    await request('/me', { baseUrl: '/api' });
    expect(headers(fetchMock).Authorization).toBe('Bearer tk-1');
  });
  it('auth:false không gắn Bearer dù có token', async () => {
    const fetchMock = stub(okJson({}));
    await request('/auth/login', { baseUrl: '/api', method: 'POST', body: {}, auth: false });
    expect(headers(fetchMock).Authorization).toBeUndefined();
  });
  it('không có token thì không có header Authorization', async () => {
    clearSession();
    const fetchMock = stub(okJson({}));
    await request('/x', { baseUrl: '/api' });
    expect(headers(fetchMock)?.Authorization).toBeUndefined();
  });
  it('POST có body: giữ Content-Type và gắn Bearer cùng lúc', async () => {
    const fetchMock = stub(okJson({}));
    await request('/orders', { baseUrl: '/api', method: 'POST', body: { a: 1 } });
    expect(headers(fetchMock)).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer tk-1' });
  });
  it('401 khi request có token: gọi handler đúng một lần và vẫn ném ApiError 401', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    stub({ ok: false, status: 401 });
    await expect(request('/me', { baseUrl: '/api' })).rejects.toMatchObject({ name: 'ApiError', status: 401 });
    expect(handler).toHaveBeenCalledTimes(1);
  });
  it('401 với auth:false hoặc khi không có token: không gọi handler', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    stub({ ok: false, status: 401 });
    await expect(request('/auth/login', { baseUrl: '/api', auth: false })).rejects.toMatchObject({ status: 401 });
    clearSession();
    await expect(request('/orders', { baseUrl: '/api' })).rejects.toMatchObject({ status: 401 });
    expect(handler).not.toHaveBeenCalled();
  });
  it('204 → null (không đọc body)', async () => {
    stub({ ok: true, status: 204, json: async () => { throw new SyntaxError('rỗng'); } });
    expect(await request('/auth/logout', { baseUrl: '/api', method: 'POST' })).toBeNull();
  });
  it('202 body rỗng → null', async () => {
    stub({ ok: true, status: 202, json: async () => { throw new SyntaxError('rỗng'); } });
    expect(await request('/auth/forgot-password', { baseUrl: '/api', method: 'POST', body: {}, auth: false })).toBeNull();
  });
  it('200 body không phải JSON vẫn ném ApiError', async () => {
    stub({ ok: true, status: 200, json: async () => { throw new SyntaxError('x'); } });
    await expect(request('/x', { baseUrl: '/api' })).rejects.toBeInstanceOf(ApiError);
  });
});

describe('đọc lỗi từ phản hồi', () => {
  const stubError = (status, json) => {
    const fetchMock = vi.fn().mockResolvedValue(json === undefined ? { ok: false, status } : { ok: false, status, json });
    vi.stubGlobal('fetch', fetchMock);
  };
  const call = (auth = false) => request('/orders', { baseUrl: '/api', method: 'POST', body: {}, auth });
  afterEach(() => { setUnauthorizedHandler(null); clearSession(); });

  it('lỗi có JSON {message, code} → ApiError mang đúng message và code', async () => {
    stubError(422, async () => ({ message: 'Mã giảm giá đã hết hạn', code: 'voucher_invalid' }));
    await expect(call()).rejects.toMatchObject({ name: 'ApiError', status: 422, message: 'Mã giảm giá đã hết hạn', code: 'voucher_invalid' });
  });
  it('lỗi không có json() (đối tượng giả cũ) → thông điệp chung và code undefined', async () => {
    stubError(404);
    await expect(call()).rejects.toMatchObject({ status: 404, message: 'Máy chủ trả lỗi 404', code: undefined });
  });
  it('lỗi có thân không phải JSON (json() ném) → thông điệp chung', async () => {
    stubError(500, async () => { throw new SyntaxError('x'); });
    await expect(call()).rejects.toMatchObject({ status: 500, message: 'Máy chủ trả lỗi 500', code: undefined });
  });
  it.each([[{}], [{ message: '' }], [{ message: '   ' }], [{ message: 42 }], [null]])('thân lỗi %j thiếu message dùng được → thông điệp chung', async (body) => {
    stubError(422, async () => body);
    await expect(call()).rejects.toMatchObject({ status: 422, message: 'Máy chủ trả lỗi 422', code: undefined });
  });
  it('message được cắt khoảng trắng đầu/cuối', async () => {
    stubError(422, async () => ({ message: '  Hết hạn  ' }));
    await expect(call()).rejects.toMatchObject({ message: 'Hết hạn' });
  });
  it('message dài hơn 300 ký tự bị cắt còn đúng 300', async () => {
    stubError(422, async () => ({ message: 'a'.repeat(500) }));
    const error = await call().catch((e) => e);
    expect(error.message).toHaveLength(300);
  });
  it('code không phải chuỗi bị bỏ', async () => {
    stubError(422, async () => ({ message: 'x', code: 5 }));
    await expect(call()).rejects.toMatchObject({ message: 'x', code: undefined });
  });
  it('401 có token vẫn gọi handler đúng một lần và message lấy từ thân lỗi', async () => {
    saveSession({ token: 'tk', expiresAt: '2099-01-01T00:00:00.000Z' });
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    stubError(401, async () => ({ message: 'Phiên đăng nhập đã hết hạn' }));
    await expect(call(true)).rejects.toMatchObject({ status: 401, message: 'Phiên đăng nhập đã hết hạn' });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
