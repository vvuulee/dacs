import { SESSION_KEY, SESSION_VERSION } from '../../constants';

// Nơi DUY NHẤT đọc/ghi token (khách và nhân viên dùng chung cách lưu, khác khoá).
// Không bao giờ ghi token ra log hay URL.
const isValidSession = (data) =>
  data?.version === SESSION_VERSION && typeof data.token === 'string' && typeof data.expiresAt === 'string';

export function createSessionStore(key) {
  function read() {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      const data = JSON.parse(raw);
      if (isValidSession(data)) return { token: data.token, expiresAt: data.expiresAt };
      console.warn('Phiên đăng nhập đã lưu không hợp lệ hoặc sai phiên bản, bỏ qua.');
    } catch (error) {
      console.warn(`Không đọc được phiên đăng nhập đã lưu: ${error.name}`);
    }
    return null;
  }

  function save({ token, expiresAt }) {
    try {
      localStorage.setItem(key, JSON.stringify({ version: SESSION_VERSION, token, expiresAt }));
    } catch (error) {
      console.warn(`Không lưu được phiên đăng nhập: ${error.name}`);
    }
  }

  function clear() {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Không xóa được phiên đăng nhập: ${error.name}`);
    }
  }

  // Không kiểm tra hạn: hạn chỉ kiểm lúc mở app, còn lúc đang chạy thì backend trả 401.
  return { read, save, clear, getToken: () => read()?.token ?? null };
}

const customer = createSessionStore(SESSION_KEY);

export const readSession = customer.read;
export const saveSession = customer.save;
export const clearSession = customer.clear;
export const getToken = customer.getToken;

export const isSessionExpired = (session, now = Date.now()) => Date.parse(session.expiresAt) <= now;
