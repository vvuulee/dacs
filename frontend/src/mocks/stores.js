import { provinces } from './addresses';

// Dữ liệu mẫu hư cấu: tên, địa chỉ và số điện thoại đều là giả.
const STORES_PER_PROVINCE = 3;
const HOURS = ['07:00 – 22:00', '06:30 – 21:30'];

export const stores = provinces.flatMap((province, provinceIndex) =>
  Array.from({ length: STORES_PER_PROVINCE }, (_, i) => {
    const number = provinceIndex * STORES_PER_PROVINCE + i + 1;
    return {
      id: `s${number}`,
      name: `Cửa hàng Mẫu ${number}`,
      province_id: province.id,
      province_name: province.name,
      ward_name: `Phường Mẫu ${i + 1}`,
      street: `${number * 10} Phố Mẫu`,
      phone: `028000000${String(number).padStart(2, '0')}`,
      opening_hours: HOURS[number % HOURS.length],
    };
  }));
