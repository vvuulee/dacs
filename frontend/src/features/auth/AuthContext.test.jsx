import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { adapter } from '../../api';
import { ApiError, request } from '../../api/client';
import { createQueryClient } from '../../api/queryClient';
import { AuthProvider, useAuth } from './AuthContext';
import { clearSession, readSession, saveSession } from './session';

vi.mock('../../api', async () => {
  const { createMockAdapter } = await import('../../api/adapters/mockAdapter');
  return { adapter: createMockAdapter(0) };
});

const NEW = { name: 'An', email: 'an@x.vn', password: 'matkhau123' };
let auth;
let queryClient;
function Capture() {
  auth = useAuth();
  return (
    <>
      <p data-testid="status">{auth.status}</p>
      <p data-testid="name">{auth.user?.name ?? ''}</p>
      <p data-testid="expired">{String(auth.sessionExpired)}</p>
    </>
  );
}
const renderAuth = () => {
  queryClient = createQueryClient();
  return render(<QueryClientProvider client={queryClient}><AuthProvider><Capture /></AuthProvider></QueryClientProvider>);
};
const status = () => screen.getByTestId('status').textContent;
async function seedUser() {
  const result = await adapter.register(NEW);
  return { token: result.token, expiresAt: result.expires_at };
}

beforeEach(() => { localStorage.clear(); clearSession(); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('không phiên → anonymous và không gọi getMe', () => {
  const spy = vi.spyOn(adapter, 'getMe');
  renderAuth();
  expect(status()).toBe('anonymous');
  expect(spy).not.toHaveBeenCalled();
});
it('phiên hết hạn → anonymous, phiên bị xóa, không gọi getMe', () => {
  saveSession({ token: 'cu', expiresAt: '2000-01-01T00:00:00.000Z' });
  const spy = vi.spyOn(adapter, 'getMe');
  renderAuth();
  expect(status()).toBe('anonymous');
  expect(readSession()).toBeNull();
  expect(spy).not.toHaveBeenCalled();
});
it('phiên còn hạn → loading rồi authenticated với đúng tên', async () => {
  saveSession(await seedUser());
  renderAuth();
  expect(status()).toBe('loading');
  await waitFor(() => expect(status()).toBe('authenticated'));
  expect(screen.getByTestId('name')).toHaveTextContent('An');
});
it('getMe trả 401 → anonymous và phiên bị xóa', async () => {
  saveSession({ token: 'tk', expiresAt: '2099-01-01T00:00:00.000Z' });
  vi.spyOn(adapter, 'getMe').mockRejectedValue(new ApiError(401, 'x'));
  renderAuth();
  await waitFor(() => expect(status()).toBe('anonymous'));
  expect(readSession()).toBeNull();
});
it('getMe lỗi mạng (status 0) → anonymous nhưng token còn trong localStorage', async () => {
  saveSession({ token: 'tk', expiresAt: '2099-01-01T00:00:00.000Z' });
  vi.spyOn(adapter, 'getMe').mockRejectedValue(new ApiError(0, 'mạng'));
  renderAuth();
  await waitFor(() => expect(status()).toBe('anonymous'));
  expect(readSession()).not.toBeNull();
});
it('login: authenticated, phiên đã lưu, query cũ bị xóa', async () => {
  await adapter.register(NEW);
  renderAuth();
  queryClient.setQueryData(['my-orders', 'x'], [1]);
  await act(() => auth.login({ email: 'an@x.vn', password: 'matkhau123' }));
  expect(status()).toBe('authenticated');
  expect(readSession()).not.toBeNull();
  expect(queryClient.getQueryData(['my-orders', 'x'])).toBeUndefined();
});
it('login sai → ném ApiError 401 và vẫn anonymous', async () => {
  await adapter.register(NEW);
  renderAuth();
  await expect(act(() => auth.login({ email: 'an@x.vn', password: 'sai-mat-khau' }))).rejects.toMatchObject({ status: 401 });
  expect(status()).toBe('anonymous');
});
it('register đăng nhập luôn', async () => {
  renderAuth();
  await act(() => auth.register(NEW));
  expect(status()).toBe('authenticated');
  expect(screen.getByTestId('name')).toHaveTextContent('An');
});
it('logout: phiên và cache xóa kể cả khi adapter.logout bị từ chối, warn không chứa token', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  renderAuth();
  await act(() => auth.register(NEW));
  const { token } = readSession();
  queryClient.setQueryData(['my-orders', 'x'], [1]);
  vi.spyOn(adapter, 'logout').mockRejectedValue(new Error('mất mạng'));
  await act(() => auth.logout());
  expect(status()).toBe('anonymous');
  expect(readSession()).toBeNull();
  expect(queryClient.getQueryData(['my-orders', 'x'])).toBeUndefined();
  await waitFor(() => expect(warn).toHaveBeenCalled());
  expect(JSON.stringify(warn.mock.calls)).not.toContain(token);
});
it('logout thu hồi phiên phía mock (token cũ không dùng lại được)', async () => {
  renderAuth();
  await act(() => auth.register(NEW));
  const old = readSession();
  await act(() => auth.logout());
  await waitFor(async () => {
    saveSession(old);
    await expect(adapter.getMe()).rejects.toMatchObject({ status: 401 });
  });
});
it('401 từ request có token → anonymous, sessionExpired=true; login lại đặt cờ về false', async () => {
  renderAuth();
  await act(() => auth.register(NEW));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
  await act(async () => { await request('/me', { baseUrl: '/api' }).catch(() => {}); });
  expect(status()).toBe('anonymous');
  expect(screen.getByTestId('expired')).toHaveTextContent('true');
  expect(readSession()).toBeNull();
  vi.unstubAllGlobals();
  await act(() => auth.login({ email: 'an@x.vn', password: 'matkhau123' }));
  expect(screen.getByTestId('expired')).toHaveTextContent('false');
});
it('dismissExpired đặt cờ về false', async () => {
  renderAuth();
  await act(() => auth.register(NEW));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
  await act(async () => { await request('/me', { baseUrl: '/api' }).catch(() => {}); });
  act(() => auth.dismissExpired());
  expect(screen.getByTestId('expired')).toHaveTextContent('false');
});
it('setUser cập nhật người dùng', async () => {
  renderAuth();
  await act(() => auth.register(NEW));
  act(() => auth.setUser({ ...auth.user, name: 'An Mới' }));
  expect(screen.getByTestId('name')).toHaveTextContent('An Mới');
});
it('useAuth ngoài provider ném lỗi nêu AuthProvider', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
});
