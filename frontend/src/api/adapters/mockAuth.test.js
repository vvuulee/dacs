import { clearSession, saveSession } from '../../features/auth/session';
import { setUnauthorizedHandler } from '../client';
import { createMockAdapter } from './mockAdapter';

let clock;
let adapter;
const NEW = { name: 'An', email: 'an@x.vn', password: 'matkhau123' };
const signIn = (result) => saveSession({ token: result.token, expiresAt: result.expires_at });

beforeEach(() => { localStorage.clear(); clearSession(); clock = 1_000_000; adapter = createMockAdapter(0, () => clock); });
afterEach(() => clearSession());

it('getMe không token → 401', async () => await expect(adapter.getMe()).rejects.toMatchObject({ status: 401 }));
it('register rồi đặt phiên → getMe trả user thô, không có mật khẩu', async () => {
  signIn(await adapter.register(NEW));
  const me = await adapter.getMe();
  expect(me).toMatchObject({ name: 'An', email: 'an@x.vn', phone: null, address: null });
  expect(JSON.stringify(me)).not.toContain('matkhau123');
});
it('updateMe và changePassword dùng token của getToken()', async () => {
  signIn(await adapter.register(NEW));
  expect((await adapter.updateMe({ name: 'An B', phone: null, address: null })).name).toBe('An B');
  await adapter.changePassword({ current_password: 'matkhau123', new_password: 'matkhau456' });
  expect((await adapter.login({ email: 'an@x.vn', password: 'matkhau456' })).token).toBeDefined();
});
it('logout xong thì getMe → 401', async () => {
  signIn(await adapter.register(NEW));
  await adapter.logout();
  await expect(adapter.getMe()).rejects.toMatchObject({ status: 401 });
});
it('logout không đăng nhập không ném', async () => await expect(adapter.logout()).resolves.toBeUndefined());
it('forgotPassword → peekResetToken → resetPassword → đăng nhập mật khẩu mới', async () => {
  await adapter.register(NEW);
  await adapter.forgotPassword({ email: 'an@x.vn' });
  const token = await adapter.peekResetToken('an@x.vn');
  await adapter.resetPassword({ token, new_password: 'matkhau456' });
  expect((await adapter.login({ email: 'an@x.vn', password: 'matkhau456' })).user.email).toBe('an@x.vn');
});

describe('báo hết phiên như client thật', () => {
  it('request có token mà bị 401 → gọi handler đúng một lần', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    saveSession({ token: 'khong-co-trong-bang', expiresAt: '2099-01-01T00:00:00.000Z' });
    await expect(adapter.getMe()).rejects.toMatchObject({ status: 401 });
    expect(handler).toHaveBeenCalledTimes(1);
    setUnauthorizedHandler(null);
  });
  it('không có token (khách) → 401 không gọi handler', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    await expect(adapter.getMe()).rejects.toMatchObject({ status: 401 });
    expect(handler).not.toHaveBeenCalled();
    setUnauthorizedHandler(null);
  });
  it('đăng nhập sai (không gắn token) → không gọi handler dù còn token cũ', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    saveSession({ token: 'cu', expiresAt: '2099-01-01T00:00:00.000Z' });
    await expect(adapter.login({ email: 'khong@co.vn', password: 'matkhau123' })).rejects.toMatchObject({ status: 401 });
    expect(handler).not.toHaveBeenCalled();
    setUnauthorizedHandler(null);
  });
});
