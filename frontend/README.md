# Cà Phê Mẫu — web đặt đồ uống (giai đoạn 1–5)

Frontend desktop (React + Vite, JavaScript): Trang chủ, Menu, Chi tiết món, Giỏ hàng, Thanh toán, trả tiền online giả lập, Theo dõi đơn, Tài khoản (đăng ký, đăng nhập, quên mật khẩu, hồ sơ, lịch sử đơn), Cửa hàng (chỉ xem), Ưu đãi / mã giảm giá, và **trang nhân viên** `/staff` (bán tại quầy, đơn online, voucher, tồn kho, lịch sử hôm nay). Chạy bằng dữ liệu mẫu; sẵn sàng nối API thật qua lớp adapter/mapper.

Tài liệu: `docs/superpowers/specs/` (thiết kế) và `docs/superpowers/plans/` (kế hoạch) của từng giai đoạn.

## Chạy

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # Vitest
npm run build    # bản production vào dist/
```

Hỗ trợ màn hình từ khoảng 1024px trở lên; chưa có bản điện thoại/máy tính bảng.

## Các trang

| Route | Nội dung |
|---|---|
| `/` | Trang chủ |
| `/menu`, `/menu/:id` | Menu; chi tiết món mở dạng modal |
| `/stores` | Danh sách cửa hàng; lọc `?province=`, tìm `?q=`; link "Chỉ đường" mở Google Maps |
| `/offers` | Khuyến mãi công khai, nút "Sao chép mã" |
| `/cart` | Giỏ hàng |
| `/checkout` | Thông tin giao hàng (Tỉnh/Thành → Phường/Xã, không có cấp Quận/Huyện), phương thức thanh toán, đặt hàng |
| `/payment/:id` | Trả tiền online giả lập (mã QR mẫu, đếm ngược 5 phút) cho chuyển khoản/ví |
| `/orders`, `/orders/:id` | Tra cứu đơn bằng mã đơn + số điện thoại; theo dõi trạng thái (tự cập nhật mỗi 5 giây) |
| `/login`, `/register` | Đăng nhập, đăng ký (email + mật khẩu); hỗ trợ `?returnTo=` (chỉ nhận đường dẫn nội bộ) |
| `/forgot-password`, `/reset-password?token=` | Quên và đặt lại mật khẩu |
| `/account` | Hồ sơ (họ tên, số điện thoại, một địa chỉ mặc định), đổi mật khẩu, đăng xuất — cần đăng nhập |
| `/account/orders` | Lịch sử đơn của tài khoản — cần đăng nhập |

Đơn gần đây được nhớ trong trình duyệt (tối đa 10). Mock đơn hàng lưu trong `localStorage`; trạng thái đơn **do nhân viên chuyển** ở `/staff/orders` (Chờ xác nhận → Đang pha chế → Đang giao → Đã giao), không còn tự chạy theo thời gian; chỉ hạn thanh toán online 5 phút vẫn tính theo thời gian. Nút "Giả lập đã thanh toán" chỉ có ở chế độ mock.

## Nối API thật

Luồng dữ liệu: `component → hook → service → adapter (mock | http) → mapper → model nội bộ`.

1. Đặt biến môi trường (xem `.env.example`):
   ```
   VITE_API_MODE=http
   VITE_API_BASE_URL=https://api.example.com/v1
   ```
2. Nếu tên trường của backend khác giả định bên dưới, chỉ sửa `src/mappers/` (`product.js`, `category.js`, `address.js`, `order.js`). Không cần sửa component.
3. Nếu đường dẫn hoặc tham số khác, sửa `src/api/adapters/httpAdapter.js`.

`VITE_API_MODE=http` mà thiếu `VITE_API_BASE_URL` sẽ báo lỗi ngay khi khởi động.

### Hợp đồng API giả định (REST, chỉ để đối chiếu)

```
GET  /categories                 → [{ id, name, image }]
GET  /products?category=&q=      → [{ id, name, description, image, category_id, base_price,
                                      sizes:[{id,label,extra_price}], toppings:[{id,name,price}],
                                      is_available }]
GET  /products/:id               → một sản phẩm như trên; 404 nếu không có
GET  /provinces                  → [{ id, name }]
GET  /provinces/:id/wards        → [{ id, name }]
POST /orders                     → order
     { client_request_id, customer:{name,phone}, address:{province_id,ward_id,street},
       note, payment_method, items:[{product_id,size_id,topping_ids,note,quantity}] }
GET  /orders/:id?phone=          → order; sai mã hoặc sai SĐT đều → 404
```

Dạng `order` trả về:

```
{ id, status, payment_method, payment_status,
  customer:{name,phone}, address:{province_name,ward_name,street}, note,
  items:[{product_id,name,summary,note,quantity,unit_price}],
  subtotal, delivery_fee, total, created_at,          // created_at: ISO 8601
  payment: null | { expires_at, qr_content } }        // expires_at: ISO 8601
```

- `status`: `awaiting_payment`, `placed`, `preparing`, `delivering`, `delivered`, `cancelled`. `payment_method`: `cash`, `bank_transfer`, `wallet`. `payment_status`: `unpaid`, `pending`, `paid`, `expired`.
- Request đặt hàng **không gửi giá**: backend tự tính giá món, phí giao và tổng tiền. Giá trên frontend chỉ để hiển thị.
- `client_request_id` giúp backend không tạo đơn trùng khi khách bấm đặt hai lần hoặc thử lại sau lỗi mạng.
- Thanh toán thật có thể là chuyển hướng hoặc webhook: frontend chỉ polling `payment_status`; `simulatePayment` chỉ tồn tại ở mock.
- Một tỉnh thật có thể có hàng trăm phường/xã: khi nối dữ liệu thật nên đổi ô chọn Phường/Xã sang ô có tìm kiếm.
- Một phần tử sai định dạng trong danh sách món/tỉnh/phường bị bỏ qua kèm `console.warn`; một đơn sai định dạng thì cả đơn báo lỗi.

### Hợp đồng API giả định cho tài khoản (REST, chỉ để đối chiếu)

`(Bearer)` = cần `Authorization: Bearer <token>`.

```
POST  /auth/register         { name, email, password }                    → { token, expires_at, user }   (email trùng → 409)
POST  /auth/login            { email, password }                          → { token, expires_at, user }   (sai → 401, một thông báo chung)
POST  /auth/logout           (Bearer)                                     → 204
GET   /me                    (Bearer)                                     → user
PATCH /me                    (Bearer) { name, phone, address }            → user
POST  /auth/change-password  (Bearer) { current_password, new_password }  → 204   (sai mật khẩu hiện tại → 422)
POST  /auth/forgot-password  { email }                                    → 202   (luôn thành công)
POST  /auth/reset-password   { token, new_password }                      → 204   (token sai/hết hạn/đã dùng → 400)
GET   /me/orders             (Bearer)                                     → [order]   (mới nhất trước, tối đa 50)
```

- `user`: `{ id, name, email, phone: string | null, address: null | { province_id, ward_id, street } }`; `expires_at`: ISO 8601.
- `POST /orders` nhận thêm Bearer tùy chọn (token hợp lệ thì gắn đơn vào tài khoản; token sai/hết hạn → 401). `GET /orders/:id` với Bearer của chủ đơn thì không cần `phone`; còn lại vẫn cần mã + `phone`, sai một trong hai → 404 như nhau.
- Chưa phân trang lịch sử đơn.

### Hợp đồng API giả định cho cửa hàng và ưu đãi (REST, chỉ để đối chiếu)

```
GET  /stores?province=&q=   → [{ id, name, province_id, province_name, ward_name, street, phone, opening_hours }]
GET  /offers                → [{ id, title, description, code, min_order, expires_at }]    (chỉ ưu đãi còn hiệu lực)
POST /vouchers/validate     { code, items:[{ product_id, size_id, topping_ids, quantity }] }
                            → 200 { valid: true, code, title, discount }
                            | 200 { valid: false, reason }          (lý do nghiệp vụ luôn là 200)
POST /orders                thêm trường tùy chọn voucher_code; đơn trả về thêm discount, voucher_code
                            | 422 { message, code: "voucher_invalid" }   khi mã không còn hợp lệ lúc đặt
```

- `total = subtotal + delivery_fee − discount` do backend tính; request kiểm tra mã không gửi giá và không gửi ghi chú.
- **Quy ước lỗi:** phản hồi lỗi có thể mang JSON `{ message, code? }`. `client.js` hiển thị `message` (cắt tối đa 300 ký tự) và đọc `code`; nếu thiếu thì dùng thông điệp chung. `message` phải là chữ dành cho người dùng, không chứa thông tin nội bộ.

## Cửa hàng và ưu đãi

- **Cửa hàng chỉ xem**, không ảnh hưởng đặt hàng. "Chỉ đường" là một link mở Google Maps trong tab mới; URL luôn do frontend tự dựng từ địa chỉ (tiền tố cố định + địa chỉ đã mã hóa), **không bao giờ dùng URL do backend trả về**. Link `tel:` chỉ giữ chữ số và dấu `+`. Chưa có "đang mở/đã đóng", sắp theo khoảng cách hay phân trang.
- **Mã giảm giá chỉ áp ở trang Thanh toán** (giỏ hàng chỉ gợi ý). Mã đã áp không được lưu: tải lại trang thì phải áp lại, và nếu giỏ đổi sau khi áp thì mã mất hiệu lực. Mức giảm do backend tính, frontend chỉ hiển thị.
- Đặt hàng với mã không còn hợp lệ (backend trả 422 kèm `code: "voucher_invalid"`): hiện lý do thật, gỡ mã, giữ giỏ và form, và dùng `client_request_id` mới cho lần đặt kế tiếp.
- Mã mẫu của mock: `CHAO10`, `GIAM20K`, `FREESHIP`, `COMBO15` (còn hạn) và `HETHAN` (đã hết hạn, không liệt kê) để thử thông báo lỗi. Dữ liệu cửa hàng là dữ liệu mẫu hư cấu.

## Tài khoản và phiên đăng nhập

Đăng nhập là **tùy chọn**: khách vãng lai vẫn đặt hàng và tra đơn bằng mã đơn + số điện thoại. Khi đã đăng nhập: trang thanh toán tự điền sẵn từ hồ sơ (không ghi đè dữ liệu đã gõ), đơn đặt được gắn vào tài khoản, và đơn của chính mình mở không cần số điện thoại. Đơn đặt lúc là khách vãng lai không tự gắn vào tài khoản.

- **Phiên là một token trong `localStorage`, không làm mới** (module `src/features/auth/session.js`; `src/api/client.js` tự gắn `Authorization: Bearer`). Rủi ro: lộ token nếu web có lỗi XSS, và hết hạn thì phải đăng nhập lại. Nên triển khai kèm Content-Security-Policy. Token không bao giờ nằm trong URL, log hay thông báo lỗi.
- Chuyển sang cookie httpOnly sau này chỉ cần sửa `session.js` và `client.js` (và adapter nếu backend đổi hình dạng); component không đổi.
- Gặp 401 trên request có token: phiên và cache truy vấn bị xóa, hiện "Phiên đăng nhập đã hết hạn". Riêng khi đang đặt hàng thì giỏ và form còn nguyên; bấm đặt lại sẽ tạo đơn như khách vãng lai.
- Mock: người dùng, phiên, token đặt lại mật khẩu nằm trong `localStorage` của mock; mật khẩu chỉ băm đơn giản, **không phải mẫu bảo mật**. Ở chế độ mock, trang quên mật khẩu hiện "hộp thư giả lập" chứa link đặt lại (`peekResetToken` chỉ có ở mock); backend thật gửi email.
- Chưa có xác minh email; chống dò mật khẩu và giới hạn tốc độ là việc của backend. Báo "email đã được đăng ký" làm lộ email nào có tài khoản (đánh đổi thông thường).

## Trang nhân viên

Khu `/staff/*` dùng layout riêng (sidebar nâu, không có header/footer của khách) và tải lười. Phiên nhân viên lưu ở khoá riêng (`coffee-web:staff-session`) nên một máy có thể đăng nhập cả khách lẫn nhân viên; 401/403 của API nhân viên chỉ đăng xuất nhân viên.

**Tài khoản mẫu (chỉ chế độ mock):** `nhanvien@caphe.test` / `nhanvien123`.

| Route | Nội dung |
|---|---|
| `/staff/login` | Đăng nhập nhân viên (không có đăng ký); `?returnTo=` chỉ nhận đường dẫn trong `/staff` |
| `/staff` | Bán hàng tại quầy: tại bàn (bắt buộc số bàn) / mang đi, chọn size–topping, áp voucher, tiền mặt (gợi ý số tiền, tiền thối) hoặc chuyển khoản, in hoá đơn 80mm |
| `/staff/orders` | Đơn online hôm nay theo tab trạng thái, mỗi đơn một nút đi bước tiếp; huỷ được khi chưa đi giao; tự tải lại mỗi 5 giây |
| `/staff/vouchers` | Danh sách voucher (cả mã hết hạn), tạo và xoá voucher |
| `/staff/inventory` | Bật/tắt Còn/Hết cho từng món; khách online và quầy đều thấy ngay |
| `/staff/history` | Đơn và thống kê **chỉ hôm nay** (cả quầy và online); không xem được ngày khác |
| `/staff/account` | Hồ sơ, đổi mật khẩu, đăng xuất |

- Đơn tại quầy không có phí giao, tạo ra là `completed`/`paid`. Mã `FREESHIP` không dùng tại quầy. Chuyển khoản tại quầy do nhân viên tự xác nhận ("Đã nhận chuyển khoản").
- Doanh thu hôm nay = tổng tiền các đơn hôm nay, trừ đơn huỷ và đơn chờ thanh toán. "Hôm nay" do backend quyết định (mock dùng giờ máy).
- Mock lưu voucher (`coffee-web:mock-vouchers`), trạng thái còn hàng (`coffee-web:mock-availability`) và phiên nhân viên trong `localStorage`; mở tab khách và tab nhân viên cạnh nhau để thử đồng bộ.

### Hợp đồng API giả định cho nhân viên (REST, chỉ để đối chiếu)

Mọi request gửi `Authorization: Bearer <token nhân viên>`; token sai/hết hạn → 401, token của khách → 403.

```
POST   /staff/login {email,password}       → {token, expires_at, staff:{id,name,email,role}}
POST   /staff/logout                       → 204
GET    /staff/me                           → staff
POST   /staff/me/password {current_password,new_password} → 204
POST   /staff/orders                       → order (đơn tại quầy)
       { client_request_id, service_type:'dine_in'|'takeaway', table:string|null,
         items:[{product_id,size_id,topping_ids,note,quantity}], voucher_code?,
         payment_method:'cash'|'bank_transfer', cash_received? }
GET    /staff/orders/online?status=        → order[]  (đơn online hôm nay, mới nhất trước)
PATCH  /staff/orders/:id/status {status}   → order    (sai bước hoặc đã bị đổi → 409)
GET    /staff/orders/today                 → order[]  (quầy + online, chỉ hôm nay)
GET    /staff/reports/today                → { date, order_count, revenue, cancelled_count,
                                               by_source:{counter:{count,revenue}, online:{count,revenue}},
                                               by_payment:{cash, bank_transfer, wallet} }
GET    /staff/vouchers                     → voucher[]
POST   /staff/vouchers                     → voucher; trùng mã → 409
DELETE /staff/vouchers/:id                 → 204; không có → 404
GET    /staff/products                     → product[] (có cả món hết hàng)
PATCH  /staff/products/:id {is_available}  → product
POST   /vouchers/validate                  → thêm trường tuỳ chọn source:'counter'
```

- `order` có thêm `source:'online'|'counter'`, `service_type:'delivery'|'dine_in'|'takeaway'`, `table`, `cash_received`, `change`; trạng thái mới `completed`. Đơn quầy có `customer`/`address` là `null`.
- Voucher: `{ id, code, title, description, type:'percent'|'fixed'|'freeship', value, max_discount, min_order, expires_at, listed }`.
- Chuyển bước hợp lệ: `placed→preparing→delivering→delivered`, và `placed|preparing→cancelled`.
- Đặt món đang tắt (`is_available:false`) → 422 "Món X đã hết" (cả đơn khách lẫn đơn quầy).

## Chưa có (các giai đoạn sau)

Chọn cửa hàng khi đặt hàng, bản đồ nhúng, kho voucher riêng của tài khoản, cổng thanh toán thật, xác minh email, nhiều địa chỉ, nhận đơn cũ về tài khoản, khách tự hủy/sửa đơn, đồng bộ đăng xuất giữa các tab; với nhân viên: phân quyền quản lý, sửa voucher, số lượng tồn, xem ngày khác/xuất báo cáo, máy in nhiệt, thông báo khi có đơn mới.
