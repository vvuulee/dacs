# Thiết kế giai đoạn 2: Đặt hàng (thanh toán giả lập + theo dõi đơn)

Ngày: 2026-10-30 · Trạng thái: chờ duyệt · Dựa trên: `2026-10-30-coffee-web-phase1-design.md`

## 1. Mục tiêu và bối cảnh

Hoàn thiện luồng từ giỏ hàng đến đơn hàng cho web đặt đồ uống desktop (React + Vite, JavaScript): nhập thông tin giao hàng, chọn phương thức thanh toán, (giả lập) trả tiền online, theo dõi trạng thái đơn.

Mục đích vẫn là **chuẩn bị nối backend thật** do người khác làm, hình dạng chưa biết. Tiêu chí thành công:

> Đổi sang API thật chỉ cần sửa adapter/mapper; không sửa component giao diện. Giá và phí giao hàng do backend quyết định, frontend chỉ hiển thị.

Chưa có đăng nhập (giai đoạn 3): đơn hàng là đơn của khách vãng lai.

## 2. Phạm vi

**Trong phạm vi:** trang Thanh toán (`/checkout`), trang trả tiền giả lập (`/payment/:id`), trang theo dõi đơn (`/orders/:id`), trang tra cứu + đơn gần đây (`/orders`), form địa chỉ hai cấp, mock đơn hàng, link "Đơn hàng" ở Header.

**Ngoài phạm vi:** cổng thanh toán thật, voucher/khuyến mãi (giai đoạn 4), đăng nhập và lịch sử đơn theo tài khoản (giai đoạn 3), khách tự hủy hoặc sửa đơn, thông báo đẩy/email/SMS, realtime (WebSocket).

## 3. Giả định (chưa được xác nhận)

- Hợp đồng API ở mục 7 chỉ là **giả định để người làm backend đối chiếu**.
- Cổng thanh toán thật có thể chuyển hướng hoặc dùng webhook; spec chỉ giả định hình dạng đối tượng `payment` trong đơn.
- Mức phí giao hàng và thời gian các bước của mock (mục 8) là số tùy ý để demo.
- Giao diện vẫn bám phong cách giai đoạn 1 (tiếng Việt, cam `#fb8d17`, desktop từ 1024px).

## 4. Luồng và route

```
/cart → /checkout ──(tiền mặt)────────────────────→ /orders/:id
                  └─(chuyển khoản / ví)→ /payment/:id → /orders/:id
/orders   (tra cứu bằng mã đơn + số điện thoại; danh sách đơn gần đây)
```

| Route | Nội dung |
|---|---|
| `/checkout` | Form giao hàng, chọn phương thức thanh toán, tóm tắt đơn, nút "Đặt hàng". Giỏ trống → `EmptyState` kèm link về Menu. |
| `/payment/:id` | Chỉ cho đơn trả online còn `paymentStatus=pending`: mã QR mẫu, số tiền, đếm ngược hạn thanh toán. Đơn tiền mặt, đơn đã thanh toán → chuyển sang `/orders/:id`. Hết hạn → báo hết hạn, link về Menu. |
| `/orders/:id` | Thanh tiến trình, món, địa chỉ, tổng tiền, trạng thái thanh toán. Tự polling. |
| `/orders` | Form tra cứu (mã đơn + số điện thoại) và danh sách đơn gần đây. |

Header thêm link "Đơn hàng" → `/orders`. Trang giữ chỗ `CheckoutPlaceholderPage` của giai đoạn 1 được thay bằng `CheckoutPage`.

### Hành vi đặt hàng

- Nút "Đặt hàng" bị vô hiệu khi đang gửi. Mỗi lần thử có một `clientRequestId` (UUID tạo một lần cho lần thử đó, tạo mới sau khi đặt thành công) để bấm hai lần không tạo hai đơn.
- Thành công: lưu vào đơn gần đây, **xóa giỏ**, chuyển sang `/payment/:id` (trả online) hoặc `/orders/:id` (tiền mặt).
- Thất bại: hiện cảnh báo phía trên nút; **giữ nguyên giỏ và dữ liệu form**.
- Frontend hiện "Tạm tính" trước khi đặt; phí giao và tổng tiền chỉ hiển thị từ đơn backend trả về.

### Quyền xem đơn

`GET /orders/:id?phone=` cần cả mã đơn và số điện thoại; sai một trong hai đều trả 404 như nhau. Đơn gần đây lưu cả số điện thoại nên mở lại link trên cùng trình duyệt không cần nhập lại. Nếu đơn không có trong đơn gần đây (máy khác), trang `/orders/:id` hỏi số điện thoại; tra cứu thành công thì lưu vào đơn gần đây. Số điện thoại **không nằm trong URL của app**, chỉ đi trong lời gọi API, và không ghi ra log.

## 5. Kiến trúc

Giữ nguyên luồng giai đoạn 1: `Component → hook (TanStack Query) → service → adapter (mock | http) → mapper → model nội bộ`. Adapter được mở rộng thêm: `getProvinces()`, `getWards(provinceId)`, `createOrder(request)`, `getOrder(id, phone)`, và `simulatePayment(id)` (**chỉ có ở mock**).

```
src/
  features/orders/    orderStatus.js (nhãn, thứ tự bước, trạng thái cuối), recentOrders.js
  features/checkout/  validate.js
  lib/                phone.js (chuẩn hóa + kiểm tra SĐT)
  mappers/            order.js (toOrder, toOrderRequest), address.js
  services/           orderService.js, addressService.js
  hooks/              useProvinces, useWards, useOrder, useCreateOrder
  mocks/              addresses.js, orderStore.js (lưu trữ + computeOrderStatus)
  pages/              CheckoutPage, PaymentPage, OrderTrackingPage, OrdersPage
  components/         AddressFields, PaymentMethodPicker, OrderSummary, OrderProgress, QrPlaceholder
```

Các nút/hành vi chỉ dành cho mock (nút "Giả lập đã thanh toán") chỉ hiển thị khi `env.apiMode === 'mock'`.

## 6. Model nội bộ

```
Province { id, name }            Ward { id, name }
Order { id, status, paymentMethod, paymentStatus,
        customer:{name, phone}, address:{provinceName, wardName, street}, note,
        items:[{productId, name, summary, note, quantity, unitPrice}],
        subtotal, deliveryFee, total, createdAt, payment }
payment = null | { expiresAt, qrContent }
```

- `status`: `awaiting_payment` · `placed` · `preparing` · `delivering` · `delivered` · `cancelled`. Trạng thái cuối: `delivered`, `cancelled`.
- `paymentMethod`: `cash` ("Tiền mặt, thanh toán khi nhận hàng") · `bank_transfer` ("Chuyển khoản QR") · `wallet` ("Ví điện tử"). Hai phương thức sau là "trả online".
- `paymentStatus`: `unpaid` (tiền mặt, luôn `unpaid`) · `pending` · `paid` · `expired`.
- `id` là chuỗi do backend cấp, hiển thị là "Mã đơn". Tiền là số nguyên VND như giai đoạn 1.

## 7. Hợp đồng API giả định (REST)

Chỉ để đối chiếu; mapper hấp thụ khác biệt.

```
GET  /provinces                 → [{ id, name }]
GET  /provinces/:id/wards       → [{ id, name }]
POST /orders                    → order
     { client_request_id,
       customer:{ name, phone },
       address:{ province_id, ward_id, street },
       note, payment_method,
       items:[{ product_id, size_id, topping_ids, note, quantity }] }
GET  /orders/:id?phone=         → order (sai mã hoặc sai SĐT → 404)
```

Dạng đơn API trả về (snake_case, `toOrder` chuyển sang model mục 6):
```
{ id, status, payment_method, payment_status,
  customer:{name,phone}, address:{province_name,ward_name,street}, note,
  items:[{product_id,name,summary,note,quantity,unit_price}],
  subtotal, delivery_fee, total, created_at,        // created_at: chuỗi ISO 8601
  payment: null | { expires_at, qr_content } }      // expires_at: chuỗi ISO 8601
```

- Request đặt hàng **không gửi giá**; backend tự tính giá món, phí giao, tổng tiền và trả về trong đơn.
- `toOrderRequest(form, cartItems)` (giỏ + form → request) và `toOrder(raw)` nằm chung `mappers/order.js`. `toOrder` ném lỗi nêu trường sai nếu đơn thiếu `id`/`status` hoặc `status` lạ; món lỗi trong đơn khiến cả đơn lỗi (không bỏ qua, vì tổng tiền sẽ sai).

## 8. Mock đơn hàng

- Đơn lưu trong `localStorage` (khóa `coffee-web:mock-orders`) để tải lại trang vẫn còn. Mã đơn mock: `CF` + 8 chữ số. Cùng `client_request_id` trả lại cùng một đơn.
- Request không gửi giá, nên mock tính `unitPrice` và `subtotal` từ danh mục món mẫu (`src/mocks/products.js`) theo `product_id`/`size_id`/`topping_ids`; mã món hoặc size lạ → `ApiError(422)`. `deliveryFee` = `MOCK_DELIVERY_FEE` = 15.000, `total = subtotal + deliveryFee`.
- Trạng thái là **hàm thuần** `computeOrderStatus(order, now)`. Mốc bắt đầu `start` = `createdAt` với đơn tiền mặt, = `paidAt` với đơn online.
  - Đơn online chưa có `paidAt`: `awaiting_payment` (`paymentStatus=pending`) nếu `now < createdAt + PAYMENT_TTL_MS`, ngược lại `cancelled` (`paymentStatus=expired`).
  - Còn lại, với `elapsed = now − start`: `< 15s` → `placed`; `< 45s` → `preparing`; `< 90s` → `delivering`; ngược lại `delivered`.
- Hằng số trong `constants.js`: `PAYMENT_TTL_MS = 300000`, `STEP_PLACED_MS = 15000`, `STEP_PREPARING_MS = 30000`, `STEP_DELIVERING_MS = 45000`, `MOCK_DELIVERY_FEE = 15000`, `POLL_INTERVAL_MS = 5000`, `RECENT_ORDERS_MAX = 10`.
- `simulatePayment(id)` ghi `paidAt = now` nếu đơn còn `awaiting_payment`; sau hạn thì ném `ApiError(409, ...)`.
- Dữ liệu địa chỉ mẫu: 3 tỉnh/thành (Hà Nội, TP. Hồ Chí Minh, Đà Nẵng), mỗi nơi 4 phường/xã **tên mẫu** ("Phường Mẫu 1"...). Không bịa tên phường/xã thật.

## 9. Địa chỉ hai cấp

Từ 01/7/2025 Việt Nam bỏ cấp huyện, còn hai cấp: tỉnh/thành và xã/phường; cả nước có 34 đơn vị cấp tỉnh. Form vì vậy chọn **Tỉnh/Thành → Phường/Xã** rồi nhập số nhà + tên đường; không có ô Quận/Huyện. Nguồn đối chiếu: `https://hethongphapluat.com/phap-luat/node/4591` và `https://hoanghamobile.com/tin-tuc/viet-nam-co-bao-nhieu-tinh/`.

Ô Phường/Xã bị khóa tới khi chọn tỉnh; đổi tỉnh thì xóa phường đã chọn. Danh sách tải qua `useProvinces()` / `useWards(provinceId)`; lỗi hiện `ErrorState` kèm Thử lại ngay trong ô.

## 10. Kiểm tra form

| Trường | Quy tắc |
|---|---|
| Họ tên | cắt khoảng trắng đầu/cuối, 2–60 ký tự |
| Số điện thoại | bỏ khoảng trắng; `+84` đổi thành `0`; khớp `^0(3\|5\|7\|8\|9)\d{8}$` (di động 10 số) |
| Tỉnh/Thành, Phường/Xã | bắt buộc chọn |
| Số nhà + tên đường | 5–120 ký tự |
| Ghi chú | tùy chọn, tối đa 200 ký tự (`NOTE_MAX_LENGTH`) |
| Phương thức | bắt buộc chọn, mặc định `cash` |

Lỗi hiện ngay dưới từng ô (`aria-invalid`, `aria-describedby`) khi bấm "Đặt hàng"; focus chuyển tới ô sai đầu tiên. Thông điệp bằng tiếng Việt.

## 11. Polling

`useOrder(id, phone)` hỏi lại mỗi `POLL_INTERVAL_MS`, dừng khi `delivered`/`cancelled`, không hỏi khi tab bị ẩn.
- Hỏi lại lỗi: giữ dữ liệu cũ, hiện dòng "Mất kết nối, đang thử lại".
- 404 ở lần tải đầu: hiện "Không tìm thấy đơn" và không thử lại.
- `/payment/:id` dùng cùng hook: `paymentStatus=paid` → chuyển `/orders/:id`; `expired` → báo hết hạn.

## 12. Lưu trữ phía trình duyệt

`coffee-web:recent-orders` dạng `{version: 1, items:[{id, phone, createdAt}]}`, tối đa `RECENT_ORDERS_MAX` đơn (mới nhất trước), không trùng `id`, mọi đọc/ghi bọc `try/catch`; dữ liệu hỏng hoặc sai phiên bản → danh sách rỗng, ghi cảnh báo, không crash (cùng nguyên tắc với giỏ hàng).

## 13. Kiểm thử

- **Unit:** `computeOrderStatus` (các mốc 0/14/15/44/45/89/90 giây, hết hạn thanh toán, đơn online đã thanh toán); `phone.js` và `validate.js`; `toOrder` (thiếu trường, status lạ) và `toOrderRequest` (không chứa giá, topping sắp xếp ổn định); `recentOrders` (hỏng, tối đa 10, trùng id); mock `createOrder` (cùng `client_request_id` trả cùng đơn) và `simulatePayment` (sau hạn → 409).
- **Component:** form kiểm tra lỗi và focus ô sai đầu; đặt thành công (giỏ bị xóa, đơn được lưu, chuyển trang) và thất bại (giỏ còn nguyên); đổi tỉnh xóa phường; trang thanh toán đếm ngược và giả lập thanh toán; polling bằng timer giả đi hết `placed → delivered` rồi dừng; 404; tra cứu sai số điện thoại; mở `/orders/:id` khi chưa có trong đơn gần đây thì hỏi số điện thoại.

## 14. Tiêu chí hoàn thành

- `npm test` và `npm run build` chạy sạch, không cảnh báo mới.
- Luồng giỏ → `/checkout` → (`/payment/:id`) → `/orders/:id` chạy với dữ liệu mẫu ở cả tiền mặt và trả online.
- Tải lại trang giữa chừng vẫn giữ đơn và trạng thái đúng.
- Đổi `VITE_API_MODE=http` chỉ cần cung cấp URL và chỉnh mapper/adapter; không sửa component.

## 15. Rủi ro còn lại

- Hợp đồng API thật chưa biết: phân trang, xác thực, định dạng lỗi, đối tượng `payment` có thể khác giả định.
- Một tỉnh thật có thể có hàng trăm phường/xã; `<select>` thường sẽ khó dùng, cần ô chọn có tìm kiếm khi nối dữ liệu thật.
- Số điện thoại là yếu tố duy nhất bảo vệ việc xem đơn; backend nên giới hạn tốc độ tra cứu.
- Giao diện chưa được xem bằng mắt trong trình duyệt (như giai đoạn 1).
