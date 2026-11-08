import { MOCK_VOUCHERS_KEY } from '../constants';
import { vouchers as seed } from './offers';

// Mock đóng vai CSDL voucher: lần đầu nạp dữ liệu mẫu, sau đó nhân viên tạo/xoá.
export function loadVouchers() {
  try {
    const raw = localStorage.getItem(MOCK_VOUCHERS_KEY);
    if (raw === null) return seed;
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data;
    console.warn('Voucher mock đã lưu không hợp lệ, bắt đầu danh sách trống.');
  } catch (error) {
    console.warn(`Không đọc được voucher mock: ${error.name}`);
  }
  return [];
}

export function saveVouchers(list) {
  try {
    localStorage.setItem(MOCK_VOUCHERS_KEY, JSON.stringify(list));
  } catch (error) {
    console.warn(`Không lưu được voucher mock: ${error.name}`);
  }
}
