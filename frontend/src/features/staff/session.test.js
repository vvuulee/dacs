import { SESSION_KEY, STAFF_SESSION_KEY } from '../../constants';
import { readSession, saveSession } from '../auth/session';
import { clearStaffSession, getStaffToken, readStaffSession, saveStaffSession } from './session';

beforeEach(() => { localStorage.clear(); vi.spyOn(console, 'warn').mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());

it('lưu ở khoá riêng, không đụng phiên khách', () => {
  saveSession({ token: 'khach', expiresAt: '2099-01-01T00:00:00.000Z' });
  saveStaffSession({ token: 'nv', expiresAt: '2099-01-01T00:00:00.000Z' });
  expect(readStaffSession()).toEqual({ token: 'nv', expiresAt: '2099-01-01T00:00:00.000Z' });
  expect(getStaffToken()).toBe('nv');
  expect(JSON.parse(localStorage.getItem(STAFF_SESSION_KEY)).token).toBe('nv');
  clearStaffSession();
  expect(getStaffToken()).toBeNull();
  expect(readSession().token).toBe('khach');
  expect(localStorage.getItem(SESSION_KEY)).not.toBeNull();
});
it('JSON hỏng → null', () => {
  localStorage.setItem(STAFF_SESSION_KEY, '{hỏng');
  expect(readStaffSession()).toBeNull();
});
