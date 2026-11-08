import { CART_STORAGE_KEY, CART_STORAGE_VERSION, MAX_QTY, MIN_QTY } from '../../constants';

const isValidLine = (line) =>
  typeof line?.key === 'string' &&
  Number.isInteger(line.quantity) && line.quantity >= MIN_QTY && line.quantity <= MAX_QTY &&
  Number.isInteger(line.unitPrice) && line.unitPrice >= 0;

// Mọi lỗi lưu trữ chỉ cảnh báo: giỏ hàng hỏng không được làm app crash.
export function loadCart(key = CART_STORAGE_KEY) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return [];
    const data = JSON.parse(raw);
    const valid = data?.version === CART_STORAGE_VERSION && Array.isArray(data.items) && data.items.every(isValidLine);
    if (valid) return data.items;
    console.warn('Giỏ hàng đã lưu không hợp lệ hoặc sai phiên bản, bắt đầu giỏ trống.');
  } catch (error) {
    console.warn(`Không đọc được giỏ hàng đã lưu: ${error.message}`);
  }
  return [];
}

export function saveCart(items, key = CART_STORAGE_KEY) {
  try {
    localStorage.setItem(key, JSON.stringify({ version: CART_STORAGE_VERSION, items }));
  } catch (error) {
    console.warn(`Không lưu được giỏ hàng: ${error.message}`);
  }
}
