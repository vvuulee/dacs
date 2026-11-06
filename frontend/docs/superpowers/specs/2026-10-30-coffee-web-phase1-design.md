# Thiết kế giai đoạn 1: Nền tảng + Duyệt món (web đặt đồ uống, desktop)

Ngày: 2026-10-30 · Trạng thái: chờ duyệt

## 1. Mục tiêu và bối cảnh

Xây frontend web đặt đồ uống dành cho **máy tính**, lấy cảm hứng từ web giao hàng của The Coffee House (bản gốc thiết kế kiểu điện thoại). Dùng JavaScript + React.

Mục đích: **chuẩn bị nối API/backend thật sau này**; backend do người khác làm và hiện chưa biết hình dạng. Vì vậy tiêu chí thành công chính là:

> Thay dữ liệu mẫu bằng API thật chỉ cần sửa lớp adapter/mapper, không sửa component giao diện.

Dự án chia 4 giai đoạn (mỗi giai đoạn có spec, kế hoạch, bản chạy được riêng):

1. **Nền tảng + Duyệt món** (tài liệu này)
2. Đặt hàng: thanh toán, theo dõi đơn
3. Tài khoản: đăng nhập, hồ sơ, lịch sử đơn
4. Cửa hàng + Ưu đãi

## 2. Phạm vi giai đoạn 1

**Trong phạm vi:** khung dự án, layout desktop, design tokens, lớp API + dữ liệu mẫu, Trang chủ, Menu (danh mục, lọc, tìm món), Chi tiết món (size, topping, ghi chú, số lượng), Giỏ hàng.

**Ngoài phạm vi:** thanh toán, theo dõi đơn, đăng nhập, cửa hàng, ưu đãi, bản điện thoại/máy tính bảng, TypeScript, SSR, i18n.

## 3. Giả định (chưa được xác nhận)

- Giao diện tiếng Việt; chủ đạo cam `#fb8d17`, nền trắng kem, chữ nâu đậm.
- Bố cục dựa trên mẫu phổ biến của web đặt đồ uống desktop, **không** sao chép từ trang gốc (chưa xem được giao diện thật). Có thể chỉnh khi có ảnh chụp tham khảo.
- Logo, ảnh, tên thương hiệu của The Coffee House có bản quyền: dùng **hình giữ chỗ tự tạo**; tên thương hiệu đặt trong `src/config/brand.js`.
- Hợp đồng API ở mục 7 chỉ là **giả định để người làm backend đối chiếu**, không phải sự thật về backend.
- Hỗ trợ từ khoảng 1024px trở lên.

## 4. Kiến trúc

Luồng dữ liệu một chiều:

```
Component → hook (TanStack Query) → service → adapter (mock | http) → mapper → model nội bộ
```

- **Adapter**: `mockAdapter` (dữ liệu mẫu + độ trễ giả lập) và `httpAdapter` (gọi `fetch` qua `client.js`). Chọn bằng biến môi trường `VITE_API_MODE=mock|http`; `VITE_API_BASE_URL` cho chế độ `http`.
- **Mapper**: chuyển dữ liệu thô thành model nội bộ (camelCase, kiểu rõ ràng, giá trị mặc định cho trường thiếu). Đây là nơi duy nhất biết tên trường của backend.
- **Service**: hàm thuần async, một việc một hàm (`getCategories`, `getProducts({categoryId, q})`, `getProduct(id)`).
- **Hook**: bọc service bằng TanStack Query (loading, lỗi, cache).

### Cấu trúc thư mục

```
src/
  api/        adapters/{mock,http}, client.js (ApiError)
  config/     brand.js, env.js
  mappers/    product.js, category.js
  services/   productService.js, categoryService.js
  hooks/      useProducts, useProduct, useCategories
  features/cart/   cartReducer.js, CartContext.jsx, selectors.js, storage.js
  lib/        money.js (định dạng VND), text.js (normalizeText), price.js (calcUnitPrice)
  pages/      HomePage, MenuPage, CartPage, NotFoundPage
  components/ Header, Footer, ProductCard, ProductModal, CartPanel, Skeleton, ErrorState, EmptyState
  mocks/      categories.js, products.js
  styles/     tokens.css
```

### Công nghệ

Vite, React, React Router, TanStack Query, CSS Modules + design tokens. Giỏ hàng dùng `useReducer` + Context + `localStorage` (không thêm thư viện state). Test: Vitest + Testing Library.

## 5. Model nội bộ

```
Category { id, name, image }
Product  { id, name, description, image, categoryId, basePrice,
           sizes:[{id,label,extraPrice}], toppings:[{id,name,price}], isAvailable }
CartItem { key, productId, name, image, sizeId, toppingIds[], note, quantity, unitPrice, summary }
```

- `summary` là chuỗi chỉ để hiển thị (vd. `Vừa · Thạch trái cây`), chụp lại lúc thêm vào giỏ để dòng giỏ không phải gọi API lấy tên size/topping; không dùng để tính tiền hay gộp dòng.
- Tiền là **số nguyên VND**; hiển thị bằng `Intl.NumberFormat('vi-VN')`.
- `calcUnitPrice(product, sizeId, toppingIds) = basePrice + extraPrice(size) + tổng giá topping`. Size không tồn tại → ném lỗi rõ ràng; topping không tồn tại bị bỏ qua và không tính tiền.
- Giá phía frontend chỉ để **hiển thị**. Ở giai đoạn 2, backend phải tính lại giá khi thanh toán.
- `key` của dòng giỏ = `productId|sizeId|toppingIds (sắp xếp, nối bằng ,)|note đã trim`.

## 6. Giao diện

### Route

| Route | Nội dung |
|---|---|
| `/` | Trang chủ |
| `/menu` | Menu, lọc theo `?category=` và `?q=` |
| `/menu/:id` | Chi tiết món, mở **modal** trên nền Menu (vẫn có link chia sẻ) |
| `/cart` | Trang giỏ hàng đầy đủ |
| `*` | 404 |

### Thành phần chính

- **Header cố định**: logo, điều hướng (Trang chủ, Menu), ô tìm món (debounce 300ms), nút địa chỉ giao hàng (chỉ giữ chỗ, chưa có chức năng), biểu tượng giỏ kèm số lượng.
- **Trang chủ**: banner chính, danh mục nổi bật, "Món bán chạy" (lấy từ danh sách món mẫu), footer.
- **Menu** (3 cột, từ 1200px): trái là danh mục, giữa là lưới món, phải là giỏ hàng thu gọn. Từ 1024–1199px, cột giỏ thu thành nút mở ngăn kéo.
- **Modal chi tiết món**: ảnh, tên, mô tả, chọn size (bắt buộc, mặc định size đầu), topping (chọn nhiều), ghi chú (tối đa 200 ký tự), số lượng (1–99), nút "Thêm vào giỏ" hiển thị tổng tiền. Món `isAvailable=false` hiện "Tạm hết" và vô hiệu hóa nút.
- **Giỏ hàng**: danh sách dòng, chỉnh số lượng, xóa, tạm tính. Nút "Thanh toán" chỉ dẫn tới trang giữ chỗ của giai đoạn 2.

### Tìm kiếm

So khớp không phân biệt hoa thường và **không dấu** (`"ca phe"` khớp `"Cà phê"`) qua `normalizeText`. Mock lọc phía client; `httpAdapter` gửi tham số `q`.

## 7. Hợp đồng API giả định (REST)

Chỉ để đối chiếu với backend; mapper chịu trách nhiệm hấp thụ khác biệt.

```
GET /categories          → [{ id, name, image }]
GET /products?category=&q=
                         → [{ id, name, description, image, category_id, base_price,
                              sizes:[{id,label,extra_price}], toppings:[{id,name,price}],
                              is_available }]
GET /products/:id        → một sản phẩm như trên; 404 nếu không có
```

## 8. Giỏ hàng

Reducer với các action: `ADD` (gộp dòng nếu trùng `key`), `SET_QTY` (≤0 thì xóa dòng, tối đa 99), `REMOVE`, `CLEAR`.

Lưu `localStorage` dạng `{version, items}`, mọi đọc/ghi bọc `try/catch`. Dữ liệu hỏng, sai phiên bản hoặc không đọc được → giỏ trống, ghi cảnh báo ra console, không làm app crash.

## 9. Xử lý lỗi

- `client.js` ném `ApiError {status, message}` cho phản hồi không thành công và lỗi mạng.
- Lỗi tải dữ liệu → `ErrorState` kèm nút thử lại. Đang tải → `Skeleton`.
- Món không tồn tại (404) → thông báo riêng, link về Menu.
- Tìm không có kết quả → `EmptyState`.
- Error boundary ở cấp route. Không nuốt lỗi; thông điệp đủ để debug.

## 10. Kiểm thử

- **Unit**: mapper (trường thiếu, `null`, kiểu sai), `calcUnitPrice`, `normalizeText`, `cartReducer` (gộp dòng, xóa, giới hạn số lượng), `storage` (dữ liệu hỏng, sai phiên bản).
- **Component**: lọc danh mục + tìm món; mở modal, chọn size/topping, thêm vào giỏ, số lượng và tổng tiền cập nhật.
- Dữ liệu mẫu dùng cùng đường đi `mockAdapter → mapper` như dữ liệu thật.

## 11. Tiêu chí hoàn thành

- `npm test` và `npm run build` chạy sạch, không cảnh báo mới.
- Duyệt Trang chủ → Menu → Chi tiết món → Giỏ hàng hoạt động với dữ liệu mẫu.
- Đổi `VITE_API_MODE` sang `http` chỉ cần cung cấp `VITE_API_BASE_URL` và chỉnh mapper; không sửa component.
- Giỏ hàng còn nguyên sau khi tải lại trang.

## 12. Rủi ro còn lại

- Hình dạng API thật chưa biết: mapper sẽ phải chỉnh; phân trang, xác thực, định dạng lỗi của backend có thể khác giả định.
- Bố cục chưa đối chiếu với giao diện gốc; có thể phải chỉnh khi có ảnh chụp.
- Giá tính phía client chỉ để hiển thị; cần backend tính lại ở giai đoạn 2.
