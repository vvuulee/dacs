import { ApiError } from '../api/client';
import {
  EMAIL_MAX, MOCK_RESET_TTL_MS, MOCK_RESETS_KEY, MOCK_SESSION_TTL_MS, MOCK_SESSIONS_KEY, MOCK_USERS_KEY,
  NAME_MAX, NAME_MIN, PASSWORD_MAX, PASSWORD_MIN, STREET_MAX, STREET_MIN,
} from '../constants';
import {
  CURRENT_PASSWORD_WRONG_TEXT, EMAIL_TAKEN_TEXT, LOGIN_FAILED_TEXT, NOT_LOGGED_IN_TEXT, RESET_LINK_INVALID_TEXT,
} from '../features/auth/messages';
import { isValidPhone, normalizePhone } from '../lib/phone';
import { provinces, wardsByProvince } from './addresses';

// Mock đóng vai backend xác thực. Băm mật khẩu ở đây KHÔNG phải mẫu bảo mật:
// backend thật phải dùng bcrypt/argon2 và giới hạn tốc độ thử mật khẩu.
const TOKEN_LENGTH = 32;
const HEX_BASE = 16;
const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const invalid = (message) => new ApiError(422, message);
const iso = (ms) => new Date(ms).toISOString();
const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase();
export const newToken = () => Array.from({ length: TOKEN_LENGTH }, () => Math.floor(Math.random() * HEX_BASE).toString(HEX_BASE)).join('');

export function hashPassword(email, password) {
  let hash = FNV_OFFSET;
  for (const char of `${email}\u0000${password}`) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return (hash >>> 0).toString(HEX_BASE);
}

function load(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) ?? '[]');
    if (Array.isArray(data)) return data;
    console.warn(`Dữ liệu mock ${key} không hợp lệ, bắt đầu danh sách trống.`);
  } catch (error) {
    console.warn(`Không đọc được dữ liệu mock ${key}: ${error.name}`);
  }
  return [];
}

function save(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch (error) {
    console.warn(`Không lưu được dữ liệu mock ${key}: ${error.name}`);
  }
}

const inRange = (text, min, max) => text.trim().length >= min && text.trim().length <= max;

function assertName(name) {
  if (typeof name !== 'string' || !inRange(name, NAME_MIN, NAME_MAX)) throw invalid('Họ tên không hợp lệ');
}

function assertPassword(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    throw invalid(`Mật khẩu từ ${PASSWORD_MIN} đến ${PASSWORD_MAX} ký tự`);
  }
}

function assertAddress(address) {
  if (address === null) return;
  const province = provinces.find((p) => p.id === address.province_id);
  const ward = wardsByProvince[address.province_id]?.find((w) => w.id === address.ward_id);
  if (!province || !ward || !inRange(address.street ?? '', STREET_MIN, STREET_MAX)) throw invalid('Địa chỉ không hợp lệ');
}

export function createAuthStore(now = () => Date.now()) {
  const expired = (record) => Date.parse(record.expires_at) <= now();
  const rawUser = (user) => ({ id: user.id, name: user.name, email: user.email, phone: user.phone, address: user.address });

  function startSession(user) {
    const session = { token: newToken(), user_id: user.id, expires_at: iso(now() + MOCK_SESSION_TTL_MS) };
    save(MOCK_SESSIONS_KEY, [...load(MOCK_SESSIONS_KEY), session]);
    return { token: session.token, expires_at: session.expires_at, user: rawUser(user) };
  }

  function requireUser(token) {
    const unauthorized = () => new ApiError(401, NOT_LOGGED_IN_TEXT);
    if (!token) throw unauthorized();
    const sessions = load(MOCK_SESSIONS_KEY);
    const session = sessions.find((s) => s.token === token);
    if (!session) throw unauthorized();
    if (expired(session)) {
      save(MOCK_SESSIONS_KEY, sessions.filter((s) => s !== session && s.token !== token));
      throw unauthorized();
    }
    const user = load(MOCK_USERS_KEY).find((u) => u.id === session.user_id);
    if (!user) throw unauthorized();
    return user;
  }

  const saveUser = (user) => save(MOCK_USERS_KEY, load(MOCK_USERS_KEY).map((u) => (u.id === user.id ? user : u)));

  return {
    toRawUser: rawUser,
    requireUser,
    register({ name, email, password }) {
      assertName(name);
      const normalized = normalizeEmail(email);
      if (normalized.length > EMAIL_MAX || !EMAIL_PATTERN.test(normalized)) throw invalid('Email không hợp lệ');
      assertPassword(password);
      const users = load(MOCK_USERS_KEY);
      if (users.some((u) => u.email === normalized)) throw new ApiError(409, EMAIL_TAKEN_TEXT);
      const user = {
        id: `u-${newToken().slice(0, 8)}`, name: name.trim(), email: normalized,
        password_hash: hashPassword(normalized, password), phone: null, address: null,
      };
      save(MOCK_USERS_KEY, [...users, user]);
      return startSession(user);
    },
    login({ email, password }) {
      const normalized = normalizeEmail(email);
      const user = load(MOCK_USERS_KEY).find((u) => u.email === normalized);
      // Email lạ và sai mật khẩu cho cùng một lỗi để không lộ email nào có tài khoản.
      if (!user || user.password_hash !== hashPassword(normalized, String(password ?? ''))) {
        throw new ApiError(401, LOGIN_FAILED_TEXT);
      }
      return startSession(user);
    },
    logout(token) {
      if (!token) return;
      save(MOCK_SESSIONS_KEY, load(MOCK_SESSIONS_KEY).filter((s) => s.token !== token));
    },
    updateProfile(token, { name, phone, address }) {
      const user = requireUser(token);
      assertName(name);
      if (phone !== null && !isValidPhone(phone)) throw invalid('Số điện thoại không hợp lệ');
      assertAddress(address);
      const updated = {
        ...user, name: name.trim(), phone: phone === null ? null : normalizePhone(phone),
        address: address === null ? null : { ...address, street: address.street.trim() },
      };
      saveUser(updated);
      return rawUser(updated);
    },
    changePassword(token, { current_password: current, new_password: next }) {
      const user = requireUser(token);
      if (user.password_hash !== hashPassword(user.email, String(current ?? ''))) {
        throw invalid(CURRENT_PASSWORD_WRONG_TEXT);
      }
      assertPassword(next);
      saveUser({ ...user, password_hash: hashPassword(user.email, next) });
    },
    forgotPassword({ email }) {
      const user = load(MOCK_USERS_KEY).find((u) => u.email === normalizeEmail(email));
      if (!user) return;
      const others = load(MOCK_RESETS_KEY).filter((r) => r.user_id !== user.id);
      save(MOCK_RESETS_KEY, [...others, { token: newToken(), user_id: user.id, expires_at: iso(now() + MOCK_RESET_TTL_MS) }]);
    },
    resetPassword({ token, new_password: next }) {
      const resets = load(MOCK_RESETS_KEY);
      const reset = resets.find((r) => r.token === token);
      if (!reset || expired(reset)) throw new ApiError(400, RESET_LINK_INVALID_TEXT);
      assertPassword(next);
      const user = load(MOCK_USERS_KEY).find((u) => u.id === reset.user_id);
      if (!user) throw new ApiError(400, RESET_LINK_INVALID_TEXT);
      saveUser({ ...user, password_hash: hashPassword(user.email, next) });
      save(MOCK_RESETS_KEY, resets.filter((r) => r.user_id !== user.id));
      save(MOCK_SESSIONS_KEY, load(MOCK_SESSIONS_KEY).filter((s) => s.user_id !== user.id));
    },
    peekResetToken(email) {
      const user = load(MOCK_USERS_KEY).find((u) => u.email === normalizeEmail(email));
      const reset = user && load(MOCK_RESETS_KEY).find((r) => r.user_id === user.id && !expired(r));
      return reset ? reset.token : null;
    },
  };
}

// Dùng chung cho staffStore (cùng cách lưu danh sách mock trong localStorage).
export { load as loadList, save as saveList };
