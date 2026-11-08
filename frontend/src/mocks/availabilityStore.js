import { MOCK_AVAILABILITY_KEY } from '../constants';

// Ghi đè is_available theo id món; món không có trong map giữ giá trị gốc của dữ liệu mẫu.
export function loadAvailability() {
  try {
    const data = JSON.parse(localStorage.getItem(MOCK_AVAILABILITY_KEY) ?? '{}');
    if (data && typeof data === 'object' && !Array.isArray(data)) return data;
    console.warn('Dữ liệu còn hàng mock không hợp lệ, bỏ qua.');
  } catch (error) {
    console.warn(`Không đọc được dữ liệu còn hàng mock: ${error.name}`);
  }
  return {};
}

export function setAvailability(productId, isAvailable) {
  try {
    localStorage.setItem(MOCK_AVAILABILITY_KEY, JSON.stringify({ ...loadAvailability(), [productId]: isAvailable }));
  } catch (error) {
    console.warn(`Không lưu được dữ liệu còn hàng mock: ${error.name}`);
  }
}

export function withAvailability(product) {
  const override = loadAvailability()[product.id];
  return typeof override === 'boolean' ? { ...product, is_available: override } : product;
}
