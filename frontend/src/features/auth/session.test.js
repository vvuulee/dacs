import { SESSION_KEY } from '../../constants';
import { clearSession, getToken, isSessionExpired, readSession, saveSession } from './session';

beforeEach(() => { localStorage.clear(); vi.spyOn(console, 'warn').mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());

it('save rồi read trả lại giống hệt', () => {
  const session = { token: 't1', expiresAt: '2026-11-01T00:00:00.000Z' };
  saveSession(session);
  expect(readSession()).toEqual(session);
});
it('chưa có → null', () => expect(readSession()).toBeNull());
it('JSON hỏng, sai version, thiếu token → null và warn không chứa token', () => {
  localStorage.setItem(SESSION_KEY, '{hỏng');
  expect(readSession()).toBeNull();
  localStorage.setItem(SESSION_KEY, JSON.stringify({ version: 99, token: 'secret-token', expiresAt: 'x' }));
  expect(readSession()).toBeNull();
  localStorage.setItem(SESSION_KEY, JSON.stringify({ version: 1, expiresAt: 'x' }));
  expect(readSession()).toBeNull();
  expect(console.warn).toHaveBeenCalled();
  expect(JSON.stringify(console.warn.mock.calls)).not.toContain('secret-token');
});
it('isSessionExpired: đúng mốc hết hạn là đã hết hạn', () => {
  const session = { token: 't', expiresAt: new Date(1000).toISOString() };
  expect(isSessionExpired(session, 999)).toBe(false);
  expect(isSessionExpired(session, 1000)).toBe(true);
});
it('getToken trả token đã lưu kể cả khi đã quá hạn; clearSession → null', () => {
  saveSession({ token: 'old', expiresAt: '2000-01-01T00:00:00.000Z' });
  expect(getToken()).toBe('old');
  clearSession();
  expect(getToken()).toBeNull();
});
it('setItem ném QuotaExceededError → saveSession không ném', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
  expect(() => saveSession({ token: 't', expiresAt: '2026-11-01T00:00:00.000Z' })).not.toThrow();
});
