import { RECENT_ORDERS_KEY, RECENT_ORDERS_MAX, RECENT_ORDERS_VERSION } from '../../constants';

const isValidEntry = (entry) =>
  typeof entry?.id === 'string' && typeof entry.phone === 'string' && typeof entry.createdAt === 'string';

// Mọi lỗi lưu trữ chỉ cảnh báo: đơn gần đây hỏng không được làm app crash.
export function loadRecentOrders() {
  try {
    const raw = localStorage.getItem(RECENT_ORDERS_KEY);
    if (raw === null) return [];
    const data = JSON.parse(raw);
    const valid = data?.version === RECENT_ORDERS_VERSION && Array.isArray(data.items) && data.items.every(isValidEntry);
    if (valid) return data.items;
    console.warn('Đơn gần đây đã lưu không hợp lệ hoặc sai phiên bản, bắt đầu danh sách trống.');
  } catch (error) {
    console.warn(`Không đọc được đơn gần đây: ${error.name}`);
  }
  return [];
}

function saveRecentOrders(items) {
  try {
    localStorage.setItem(RECENT_ORDERS_KEY, JSON.stringify({ version: RECENT_ORDERS_VERSION, items }));
  } catch (error) {
    console.warn(`Không lưu được đơn gần đây: ${error.name}`);
  }
}

export function addRecentOrder(entry) {
  const others = loadRecentOrders().filter((existing) => existing.id !== entry.id);
  const items = [entry, ...others].slice(0, RECENT_ORDERS_MAX);
  saveRecentOrders(items);
  return items;
}

export const findRecentOrder = (id) => loadRecentOrders().find((entry) => entry.id === id);
