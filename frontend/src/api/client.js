import { ERROR_MESSAGE_MAX } from '../constants';
import { getToken } from '../features/auth/session';

export class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function buildUrl(baseUrl, path, params) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value));
  const qs = query.toString();
  return `${baseUrl}${path}${qs ? `?${qs}` : ''}`;
}

// Phản hồi lỗi có thể mang JSON { message, code }: message là chữ backend viết sẵn để hiển thị.
async function readErrorDetail(response) {
  try {
    const body = await response.json();
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    return {
      message: message ? message.slice(0, ERROR_MESSAGE_MAX) : null,
      code: typeof body?.code === 'string' ? body.code : undefined,
    };
  } catch {
    return { message: null, code: undefined };
  }
}

let unauthorizedHandler = null;

// Gọi khi một request đã gửi token mà bị 401 (phiên hết hạn hoặc bị thu hồi).
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

// Mock dùng chung để mô phỏng đúng hành vi của request thật khi bị 401.
export function notifyUnauthorized() {
  unauthorizedHandler?.();
}

function buildInit({ method, signal, body, token }) {
  const init = { method, signal };
  const headers = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  if (Object.keys(headers).length > 0) init.headers = headers;
  return init;
}

export async function request(path, { baseUrl, params = {}, signal, method = 'GET', body, auth = true } = {}) {
  const token = auth ? getToken() : null;
  let response;
  try {
    response = await fetch(buildUrl(baseUrl, path, params), buildInit({ method, signal, body, token }));
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(0, 'Không kết nối được tới máy chủ');
  }
  if (!response.ok) {
    const { message, code } = await readErrorDetail(response);
    if (response.status === 401 && token) notifyUnauthorized();
    throw new ApiError(response.status, message ?? `Máy chủ trả lỗi ${response.status}`, code);
  }
  if (response.status === 204) return null;
  try {
    return await response.json();
  } catch {
    if (response.status === 202) return null;
    throw new ApiError(response.status, 'Phản hồi không hợp lệ');
  }
}
