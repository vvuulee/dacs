import { SESSION_KEY, SESSION_VERSION } from '../../constants';

// Nơi DUY NHẤT đọc/ghi token. Không bao giờ ghi token ra log hay URL.
const isValidSession = (data) =>
  data?.version === SESSION_VERSION && typeof data.token === 'string' && typeof data.expiresAt === 'string';

export function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw === null) return null;
    const data = JSON.parse(raw);
    if (isValidSession(data)) return { token: data.token, expiresAt: data.expiresAt };
    console.warn('Phiên đăng nhập đã lưu không hợp lệ hoặc sai phiên bản, bỏ qua.');
  } catch (error) {
    console.warn(`Không đọc được phiên đăng nhập đã lưu: ${error.name}`);
  }
  return null;
}

export function saveSession({ token, expiresAt }) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ version: SESSION_VERSION, token, expiresAt }));
  } catch (error) {
    console.warn(`Không lưu được phiên đăng nhập: ${error.name}`);
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.warn(`Không xóa được phiên đăng nhập: ${error.name}`);
  }
}

export const isSessionExpired = (session, now = Date.now()) => Date.parse(session.expiresAt) <= now;

// Không kiểm tra hạn: hạn chỉ kiểm lúc mở app, còn lúc đang chạy thì backend trả 401.
export const getToken = () => readSession()?.token ?? null;
