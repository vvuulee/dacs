const MODES = ['mock', 'http'];

export function readEnv(raw) {
  const apiMode = raw.VITE_API_MODE || 'mock';
  if (!MODES.includes(apiMode)) {
    throw new Error(`VITE_API_MODE không hợp lệ: "${apiMode}" (chỉ nhận ${MODES.join(' | ')})`);
  }
  const apiBaseUrl = raw.VITE_API_BASE_URL || '';
  if (apiMode === 'http' && !apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL là bắt buộc khi VITE_API_MODE=http');
  }
  return { apiMode, apiBaseUrl };
}

export const env = readEnv(import.meta.env);
