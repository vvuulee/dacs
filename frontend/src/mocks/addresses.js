export const provinces = [
  { id: 'hn', name: 'Hà Nội' },
  { id: 'hcm', name: 'TP. Hồ Chí Minh' },
  { id: 'dn', name: 'Đà Nẵng' },
];

const WARDS_PER_PROVINCE = 4;

// Tên phường/xã là tên mẫu; danh sách thật do API cung cấp.
export const wardsByProvince = Object.fromEntries(
  provinces.map((province) => [
    province.id,
    Array.from({ length: WARDS_PER_PROVINCE }, (_, i) => ({
      id: `${province.id}-${i + 1}`,
      name: `Phường Mẫu ${i + 1}`,
    })),
  ]),
);
