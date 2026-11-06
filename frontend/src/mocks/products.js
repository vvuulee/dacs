const SIZES = [
  { id: 's', label: 'Nhỏ', extra_price: 0 },
  { id: 'm', label: 'Vừa', extra_price: 6000 },
  { id: 'l', label: 'Lớn', extra_price: 10000 },
];
const TOPPINGS = [
  { id: 'tran-chau', name: 'Trân châu', price: 8000 },
  { id: 'thach', name: 'Thạch trái cây', price: 6000 },
  { id: 'kem-cheese', name: 'Kem cheese', price: 10000 },
];

const img = (file) => `/images/products/${file}.jpg`;

const drink = (id, category_id, name, base_price, description, extra = {}) => ({
  id, name, description, image: '', category_id, base_price,
  sizes: SIZES, toppings: TOPPINGS, is_available: true, ...extra,
});
const food = (id, category_id, name, base_price, description, extra = {}) =>
  drink(id, category_id, name, base_price, description, { sizes: [], toppings: [], ...extra });

export const products = [
  drink('cf-sua-da', 'ca-phe', 'Cà phê sữa đá', 29000, 'Cà phê phin đậm vị, sữa đặc.', { toppings: [], image: img('ca-phe-sua-da') }),
  drink('cf-den-da', 'ca-phe', 'Cà phê đen đá', 25000, 'Cà phê nguyên chất, không đường.', { toppings: [] }),
  drink('bac-xiu', 'ca-phe', 'Bạc xỉu', 29000, 'Nhiều sữa, ít cà phê.', { toppings: [], image: img('bac-xiu') }),
  drink('cold-brew', 'ca-phe', 'Cold brew cam sả', 49000, 'Ủ lạnh 12 giờ, thêm cam và sả.', { is_available: false }),
  drink('tra-dao', 'tra', 'Trà đào cam sả', 45000, 'Trà đen, đào miếng, cam, sả.', { image: img('tra-dao') }),
  drink('tra-vai', 'tra', 'Trà vải hoa hồng', 45000, 'Trà xanh, vải, hương hoa hồng.', { image: img('tra-vai') }),
  drink('tra-oi', 'tra', 'Trà ổi hồng', 45000, 'Ổi hồng xay nhẹ, trà ô long.'),
  drink('tra-chanh', 'tra', 'Trà chanh giã tay', 35000, 'Chanh tươi giã tay, trà xanh.', { image: img('tra-chanh') }),
  drink('ts-tran-chau', 'tra-sua', 'Trà sữa trân châu', 45000, 'Trà đen, sữa, trân châu đen.', { image: img('tra-sua-tran-chau') }),
  drink('ts-matcha', 'tra-sua', 'Trà sữa matcha', 49000, 'Matcha Nhật pha sữa tươi.', { image: img('tra-sua-matcha') }),
  drink('ts-oolong', 'tra-sua', 'Trà sữa ô long', 45000, 'Ô long rang, vị hậu ngọt.'),
  drink('ts-khoai-mon', 'tra-sua', 'Trà sữa khoai môn', 49000, 'Khoai môn nghiền, sữa béo.'),
  drink('dx-socola', 'da-xay', 'Socola đá xay', 55000, 'Socola đậm, kem tươi.', { image: img('socola-da-xay') }),
  drink('dx-cookie', 'da-xay', 'Cookie đá xay', 55000, 'Bánh quy nghiền, sữa, kem tươi.'),
  drink('dx-xoai', 'da-xay', 'Xoài đá xay', 52000, 'Xoài chín xay lạnh.', { image: img('xoai-da-xay') }),
  drink('dx-cf', 'da-xay', 'Cà phê đá xay', 52000, 'Cà phê, sữa, đá xay mịn.'),
  food('b-tiramisu', 'banh', 'Tiramisu', 39000, 'Bánh tiramisu cà phê.', { image: img('tiramisu') }),
  food('b-mousse', 'banh', 'Mousse chanh dây', 39000, 'Mousse chua ngọt.'),
  food('b-croissant', 'banh', 'Bánh sừng bò', 29000, 'Nướng giòn, bơ Pháp.', { image: img('banh-sung-bo') }),
  food('b-cheesecake', 'banh', 'Cheesecake', 42000, 'Cheesecake nướng.'),
  food('an-banh-mi', 'an-nhe', 'Bánh mì que', 19000, 'Bánh mì que pate.'),
  food('an-xuc-xich', 'an-nhe', 'Xúc xích nướng', 25000, 'Xúc xích nướng mật ong.'),
  food('an-khoai', 'an-nhe', 'Khoai tây chiên', 29000, 'Khoai chiên giòn, sốt phô mai.'),
  food('an-banh-trang', 'an-nhe', 'Bánh tráng trộn', 25000, 'Bánh tráng trộn kiểu Sài Gòn.'),
];
