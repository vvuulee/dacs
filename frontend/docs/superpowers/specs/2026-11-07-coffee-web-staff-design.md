# Thiết kế giai đoạn 5: Frontend cho nhân viên tại quán

Ngày: 2026-11-07 · Trạng thái: chờ duyệt · Dựa trên: spec giai đoạn 1–4 cùng thư mục

## 1. Mục tiêu và bối cảnh

Thêm khu vực dành cho **nhân viên tại quán** vào web hiện có (React + Vite, JavaScript, desktop từ 1024px). Bố cục tham khảo ảnh POS "Coffee Management": sidebar nâu bên trái, menu món ở giữa, giỏ hàng bên phải.

Nhân viên cần:

1. **Bán hàng tại quầy**: đặt đồ cho khách tại bàn hoặc mang đi, chọn size/topping, áp voucher, thu tiền mặt (tính tiền thối) hoặc chuyển khoản, in hoá đơn.
2. **Đơn online**: chuyển trạng thái đơn khách đặt trên web (Chờ xác nhận → Đang pha chế → Đang giao → Đã giao) và huỷ đơn khi chưa đi giao.
3. **Voucher**: tạo và xoá mã giảm giá trong hệ thống.
4. **Tồn kho**: bật/tắt Còn hàng/Hết hàng cho từng món; có tác dụng cho cả khách online lẫn bán tại quầy.
5. **Lịch sử giao dịch**: chỉ xem các đơn và thống kê **của hôm nay** (cả quầy và online); không xem được ngày khác.
6. **Thông tin tài khoản**: xem hồ sơ, đổi mật khẩu, đăng xuất.

Tiêu chí thành công giữ như các giai đoạn trước:

> Đổi sang API thật chỉ cần sửa adapter/mapper; không sửa component. Giá, giảm giá, tiền thối, chuyển trạng thái, phân quyền và "hôm nay" do **backend quyết định**; frontend chỉ hiển thị và chặn sớm cho dễ dùng.

## 2. Phạm vi

**Trong phạm vi:** các route `/staff/*`, `StaffLayout`, đăng nhập nhân viên với phiên riêng, 6 màn hình ở mục 1, các API nhân viên trong mock và http adapter, các thay đổi mock ở mục 6 (trạng thái đơn được lưu, voucher chuyển sang localStorage, ghi đè còn/hết hàng, tài khoản nhân viên mẫu), việc từ chối món hết hàng khi đặt đơn, và việc sửa các test cũ bị ảnh hưởng.

**Ngoài phạm vi:** phân quyền quản lý/nhân viên, đăng ký tài khoản nhân viên, sửa voucher, nhập số lượng tồn, xem ngày khác hoặc xuất báo cáo, âm thanh hay thông báo khi có đơn mới, máy in nhiệt/ESC/POS, giao diện máy tính bảng hoặc điện thoại, nhiều chi nhánh, đổi cách trả tiền sau khi đã đặt.

## 3. Giả định và quyết định đã chốt

- **Hướng 1**: cùng app, các route nằm dưới `/staff`, trang được tải lười bằng `React.lazy`, nên khách không phải tải code của nhân viên.
- Tài khoản nhân viên **có sẵn trong mock**; email và mật khẩu mẫu ghi trong README ở mục chế độ mock. Không có trang đăng ký.
- Phiên nhân viên lưu riêng ở `coffee-web:staff-session`, tách khỏi phiên khách (`coffee-web:session`).
- Khi có nhân viên điều khiển, trạng thái đơn mock **không còn tự chuyển theo thời gian**. Riêng hạn thanh toán online 5 phút vẫn tính theo thời gian như cũ.
- "Huỷ khi chưa giao" nghĩa là **chưa đi giao**: chỉ huỷ được ở `placed` hoặc `preparing`.
- Mã `freeship` **không dùng tại quầy**, vì đơn quầy không có phí giao.
- Chuyển khoản tại quầy do nhân viên tự xác nhận bằng nút "Đã nhận chuyển khoản". Frontend không kiểm tra tiền đã vào tài khoản hay chưa.
- "Hôm nay" do backend xác định theo múi giờ của quán; mock dùng giờ máy.
- Món chỉ có một lựa chọn vẫn mở hộp chọn, để mọi món thao tác giống nhau.
- Hoá đơn in qua `window.print()`, khổ 80mm.
- Giao diện nhân viên dùng tông nâu (token mới trong `tokens.css`). Giao diện khách vẫn giữ màu cam `#fb8d17`.

## 4. Kiến trúc

### Route

| Route | Màn hình | Cần đăng nhập |
|---|---|---|
| `/staff/login` | Đăng nhập nhân viên | Không |
| `/staff` | Bán hàng tại quầy | Có |
| `/staff/orders` | Đơn online | Có |
| `/staff/vouchers` | Voucher | Có |
| `/staff/inventory` | Tồn kho | Có |
| `/staff/history` | Lịch sử và thống kê hôm nay | Có |
| `/staff/account` | Thông tin tài khoản | Có |

Các route `/staff/*` nằm **ngoài** `Layout` của khách, nên không có Header/Footer của khách. Đường dẫn `/staff/...` không khớp với route nào thì hiện `NotFoundPage` bên trong `StaffLayout`.

### Layout

`StaffLayout` gồm hai phần:

- **Sidebar**: tên quán (`BRAND`); 6 mục menu dạng `NavLink`, mục đang mở có nền sáng; thẻ nhân viên ở dưới cùng gồm tên, vai trò và nút "Đăng xuất".
- **Vùng nội dung**: tiêu đề trang, bên dưới là `<Outlet />` được bọc trong `RouteErrorBoundary`.

### Phân quyền

- `StaffAuthProvider` và `useStaffAuth()` có cấu trúc giống `AuthProvider` nhưng đọc/ghi phiên nhân viên qua `features/staff/session.js`. Phiên được kiểm tra hạn lúc mở app; trong lúc dùng thì dựa vào việc backend trả 401.
- `StaffRoute` chuyển người chưa đăng nhập về `/staff/login?returnTo=<đường dẫn>`. `returnTo` đi qua `safeReturnTo` và chỉ chấp nhận đường dẫn bắt đầu bằng `/staff`; không đạt thì về `/staff`.
- API nhân viên trả 401/403 thì xoá phiên nhân viên và chuyển về trang đăng nhập. Phiên khách không bị ảnh hưởng.
- Việc chặn thật nằm ở backend: mock từ chối mọi API `/staff/*` nếu token không phải của nhân viên (403).

### Luồng dữ liệu

Giữ nguyên `component → hook → service → adapter (mock | http) → mapper`. Phần thêm mới:

- `services/staff.js` cùng các hàm tương ứng trong `mockAdapter` và `httpAdapter`.
- Mapper: `toStaff`, `toStaffVoucher`, `toDailyReport`. `toOrder` nhận thêm các trường mới (mục 5).
- Hook: `useStaffProducts`, `useOnlineOrders` (polling `POLL_INTERVAL_MS`), `useUpdateOrderStatus`, `useCreateCounterOrder`, `useStaffVouchers`, `useCreateVoucher`, `useDeleteVoucher`, `useSetAvailability`, `useTodayOrders`, `useTodayReport`, `useStaffChangePassword`.
- Thay đổi xong (đổi trạng thái, voucher, còn hàng, tạo đơn) thì invalidate các query liên quan.

### Dùng lại

- `ProductForm` trong `ProductModal`: tách ra để dùng trong hộp chọn món của quầy.
- `CartProvider`: thêm prop `storageKey` để giỏ quầy (`coffee-web:staff-cart`) không lẫn với giỏ khách.
- Các component sẵn có: `CategoryList`, `SearchBox`, `ProductCard`, `ProductImage`, `VoucherBox`, `QrPlaceholder`, `ChangePasswordForm`, `PasswordField`, `ErrorState`, `Skeleton`, `EmptyState`.
- Thư viện và hàm sẵn có: `formatVnd`, `normalizeText`, `newRequestId`, `normalizeVoucherCode`, `STATUS_LABELS`.
- Trong mock: `priceItems`, `evaluateVoucher` (đã nhận tham số `table`), cách hash mật khẩu và quản lý phiên của `authStore`.

## 5. Hợp đồng API giả định

Mọi request nhân viên đều gửi `Authorization: Bearer <token nhân viên>`.

```
POST   /staff/login {email,password}       → {token, expires_at, staff:{id,name,email,role}}
POST   /staff/logout                       → 204
GET    /staff/me                           → staff
POST   /staff/me/password {current,next}   → 204

POST   /staff/orders                       → order (đơn tại quầy)
       { client_request_id, service_type:'dine_in'|'takeaway', table:string|null,
         items:[{product_id,size_id,topping_ids,note,quantity}], voucher_code?,
         payment_method:'cash'|'bank_transfer', cash_received? }
GET    /staff/orders/online?status=        → order[]  (đơn online hôm nay, mới nhất trước)
PATCH  /staff/orders/:id/status {status}   → order
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

**Order** có thêm các trường: `source:'online'|'counter'`, `service_type:'delivery'|'dine_in'|'takeaway'`, `table:string|null`, `cash_received:number|null`, `change:number|null`. Thêm trạng thái `completed` (nhãn "Hoàn tất").

**Voucher (nhân viên)** gồm: `{ id, code, title, description, type:'percent'|'fixed'|'freeship', value, max_discount, min_order, expires_at, listed }`.

### Quy tắc phía backend (mock làm đúng như vậy)

- **Đơn tại quầy**:
  - Phí giao bằng 0. `total = subtotal − discount`.
  - Đơn tạo ra luôn ở `status:'completed'`, `payment_status:'paid'`.
  - Trả tiền mặt: bắt buộc có `cash_received` (số nguyên) và phải ≥ `total`, nếu không thì 422. `change = cash_received − total`.
  - `dine_in` bắt buộc có `table` (1–20 ký tự, cắt khoảng trắng hai đầu); `takeaway` thì `table = null`.
  - Gửi lại `client_request_id` đã dùng thì trả về đúng đơn cũ, không tạo đơn mới.
- **Chuyển trạng thái**:
  - Các bước hợp lệ: `placed→preparing`, `preparing→delivering`, `delivering→delivered`; `placed|preparing→cancelled`.
  - Mọi bước khác, kể cả đơn `awaiting_payment` và đơn tại quầy, trả 409 kèm `message` và trạng thái hiện tại.
- **Hôm nay**: API không nhận tham số ngày. Backend tự lọc theo `created_at` thuộc ngày hiện tại.
- **Doanh thu**: tổng `total` của các đơn hôm nay, bỏ đơn `cancelled` và `awaiting_payment`. `cancelled_count` đếm riêng số đơn bị huỷ.
- **Voucher**:
  - Chuẩn hoá mã giống phía khách, phải khớp `^[A-Z0-9-]{3,32}$`.
  - `percent`: value nguyên từ 1 đến 100; `fixed`: value nguyên > 0; `freeship`: value bằng 0.
  - `max_discount` chỉ có ở `percent`, để null hoặc > 0.
  - `min_order` ≥ 0. `expires_at` phải ở tương lai.
  - Xoá voucher không ảnh hưởng đơn đã đặt.
  - `freeship` gửi kèm `source:'counter'` thì trả `valid:false` với lý do "Mã chỉ áp dụng cho đơn giao hàng".
- **Hết hàng**: `POST /orders` và `POST /staff/orders` có món `is_available:false` thì trả 422 "Món <tên> đã hết".

## 6. Thay đổi trong mock

1. **`orderStore` lưu `status`**:
   - Đơn tiền mặt bắt đầu ở `placed`. Đơn trả online ở `awaiting_payment`, `simulatePayment` thì chuyển sang `placed`. Quá hạn 5 phút mà chưa trả thì hiển thị `cancelled`/`expired`; phần này vẫn tính theo thời gian.
   - Đơn cũ đã lưu mà chưa có `status` thì coi là `placed`; đơn cũ không có `source` thì coi là `online`.
   - Xoá `stepAt` và các hằng `STEP_PLACED_MS`, `STEP_PREPARING_MS`, `STEP_DELIVERING_MS`.
2. **Store voucher** lưu ở `coffee-web:mock-vouchers`, lần đầu nạp dữ liệu từ `offers.js`. `getOffers` (chỉ lấy voucher có `listed` và còn hạn), `validateVoucher` và việc đặt hàng đều đọc từ store này.
3. **Ghi đè còn/hết hàng** lưu ở `coffee-web:mock-availability` (`{ [productId]: boolean }`), áp vào `getProducts`, `getProduct`, `priceItems`, và cả danh sách món của nhân viên.
4. **`staffStore`** có một nhân viên mẫu, sessions lưu ở `coffee-web:mock-staff-sessions`, dùng chung hash và TTL với `authStore`.
5. Hai tab khách và nhân viên dùng chung localStorage. Nhân viên đổi trạng thái thì tab khách thấy ở lần polling kế tiếp (≤ 5 giây).

## 7. Màn hình

### Đăng nhập `/staff/login`

- Gồm ô email, ô mật khẩu (`PasswordField`) và nút "Đăng nhập". Đang gửi thì khoá nút.
- Sai thông tin thì hiện "Email hoặc mật khẩu không đúng" ở `role="alert"`.
- Đã đăng nhập mà mở trang này thì chuyển về `/staff`.

### Bán hàng `/staff`

- **Cột giữa**:
  - Tab danh mục (có "Tất cả"), ô tìm món (không phân biệt dấu) và lưới thẻ món.
  - Món hết hàng có thẻ mờ, ghi "Hết hàng" và không bấm được.
- **Hộp chọn món** (dùng `ProductForm`): size, topping, ghi chú, số lượng; bấm "Thêm vào đơn" thì thêm vào giỏ quầy.
- **Cột phải**:
  - Hình thức: ◉ Tại bàn / ○ Mang đi. "Tại bàn" bắt buộc nhập ô "Số bàn"; thiếu thì báo lỗi dưới ô khi bấm Thanh toán.
  - Bảng giỏ có các cột: Tên món (kèm size/topping), SL (−/+, trong khoảng `MIN_QTY`–`MAX_QTY`), Giá, Xoá. Giỏ trống thì hiện "Chưa có món nào".
  - `VoucherBox` gọi validate với `source:'counter'`. Chữ ký giỏ đổi thì mã mất hiệu lực, giống trang Thanh toán của khách.
  - Các dòng Tạm tính, Giảm giá (nếu có) và **Thành tiền**.
  - Nút "Xoá hết" (có hộp xác nhận) và "Thanh toán" (khoá khi giỏ trống).
- **Hộp Thanh toán**:
  - Chọn Tiền mặt hoặc Chuyển khoản.
  - *Tiền mặt*: ô "Khách đưa" (chỉ nhận số) cùng các nút gợi ý: đúng bằng tổng, rồi tổng làm tròn lên bội số 50.000, 100.000, 200.000, 500.000 (bỏ những mức trùng nhau). Bên dưới hiện "Tiền thối". "Xác nhận" bị khoá khi số khách đưa nhỏ hơn tổng.
  - *Chuyển khoản*: `QrPlaceholder` kèm số tiền và nút "Đã nhận chuyển khoản".
  - Khi gửi: khoá nút. Lỗi thì hiện `message` trong hộp và giữ nguyên giỏ. `client_request_id` được sinh một lần cho mỗi đơn và dùng lại khi thử lại.
- **Hoá đơn** (sau khi đặt thành công):
  - Nội dung: tên quán, mã đơn, giờ, "Bàn X" hoặc "Mang đi", từng món kèm SL, đơn giá và thành tiền, giảm giá kèm mã, tổng, cách trả, khách đưa và tiền thối.
  - Nút "In hoá đơn" gọi `window.print()`; CSS `@media print` chỉ in phần hoá đơn, rộng 80mm.
  - Nút "Đơn mới" xoá giỏ, bỏ mã, reset hình thức về Tại bàn và sinh `client_request_id` mới.

### Đơn online `/staff/orders`

- Tab lọc: **Chờ xác nhận** (`placed`) · **Đang pha chế** · **Đang giao** · **Đã xong** (`delivered` + `cancelled`). Mỗi tab hiện số đơn. Đơn `awaiting_payment` không hiện ở tab nào.
- Thẻ đơn hiện: mã, giờ đặt, tên khách, SĐT, địa chỉ, ghi chú, danh sách món, tổng, cách trả, tình trạng thanh toán.
- Nút theo trạng thái:

| Trạng thái | Nút chính | Nút phụ |
|---|---|---|
| `placed` | Nhận đơn → pha chế | Huỷ đơn |
| `preparing` | Giao hàng | Huỷ đơn |
| `delivering` | Đã giao | — |
| `delivered`, `cancelled` | — | — |

- "Huỷ đơn" có hộp xác nhận. Đang gửi thì khoá các nút của thẻ đó.
- 409 thì hiện "Đơn đã được cập nhật bởi người khác" ở thẻ và tải lại danh sách.
- Danh sách tự tải lại mỗi `POLL_INTERVAL_MS`. Không có đơn thì hiện "Không có đơn nào".

### Voucher `/staff/vouchers`

- Bảng có các cột: Mã, Tiêu đề, Loại/giá trị ("10% tối đa 30.000 ₫", "20.000 ₫", "Miễn phí giao"), Đơn tối thiểu, Hạn dùng (`vi-VN`), Hiện ở Ưu đãi (Có/Không), Trạng thái (Còn hạn/Hết hạn), Xoá.
- **"Tạo voucher"** mở form:
  - Các ô: mã, tiêu đề (1–80 ký tự), mô tả (≤ 200), loại, giá trị, giảm tối đa, đơn tối thiểu, hạn dùng (date), ô tích "Hiện ở trang Ưu đãi".
  - Ô "giá trị" ẩn khi loại là freeship; ô "giảm tối đa" chỉ hiện khi loại là %.
  - Frontend kiểm tra đúng các quy tắc ở mục 5 trước khi gửi. Backend trả 409 thì báo "Mã đã tồn tại" dưới ô mã; trả 422 thì hiện `message`.
  - Hạn dùng chọn theo ngày, được gửi đi là 23:59:59 giờ địa phương của ngày đó, dạng ISO.
- **Xoá**: hộp xác nhận "Xoá mã X? Khách sẽ không dùng được mã này nữa. Đơn đã đặt không bị ảnh hưởng." Nút "Không" được focus sẵn.

### Tồn kho `/staff/inventory`

- Có ô tìm và tab danh mục. Mỗi dòng gồm: ảnh, tên, danh mục, công tắc Còn/Hết (`role="switch"`, `aria-checked`).
- Bấm công tắc là gọi API ngay và khoá công tắc đó khi đang gửi. Lỗi thì công tắc trả về như cũ kèm `role="alert"` "Không cập nhật được <tên món>".

### Lịch sử hôm nay `/staff/history`

- Tiêu đề "Hôm nay, dd/mm/yyyy" (lấy từ `date` trong báo cáo). Không có ô chọn ngày và không có tham số ngày trên URL.
- 4 thẻ số liệu: Số đơn, Doanh thu, Đơn huỷ, Quầy/Online (số đơn và doanh thu mỗi bên). Thêm một dòng doanh thu theo cách trả: Tiền mặt, Chuyển khoản, Ví.
- Bảng đơn có các cột: Giờ, Mã, Nguồn, Bàn/Người nhận, Số món, Tổng, Thanh toán, Trạng thái.
- Bấm vào một dòng thì mở chi tiết chỉ để xem; đơn quầy có thêm nút "In lại hoá đơn" (dùng chung component hoá đơn).
- Chưa có đơn thì hiện "Hôm nay chưa có đơn nào".

### Tài khoản `/staff/account`

Hiện họ tên, email, vai trò (chỉ xem). `ChangePasswordForm` gọi `staff.changePassword`. Có nút "Đăng xuất".

## 8. Xử lý lỗi

- 401/403 trên API nhân viên: xoá phiên nhân viên, về `/staff/login?returnTo=…`.
- Tải dữ liệu lỗi: `ErrorState` kèm "Thử lại". Khi đang tải thì hiện `Skeleton`.
- Đặt đơn quầy trả 422: hiện `message`, giữ giỏ. Nếu mã lỗi là `voucher_invalid` thì bỏ mã đang áp và hiện "Mã không còn dùng được".
- Lỗi mạng khi thanh toán: bấm lại vẫn dùng cùng `client_request_id`.
- Đổi trạng thái hoặc tạo voucher bị 409: báo tại chỗ rồi tải lại dữ liệu.
- Thao tác phá huỷ (xoá voucher, huỷ đơn, xoá hết giỏ) luôn có hộp xác nhận, focus sẵn vào "Không"; bấm Esc là đóng.
- Không ghi token ra log hay URL. Dữ liệu từ backend (ghi chú, mô tả voucher, tên khách) chỉ hiển thị dạng text, không render HTML.

## 9. Kiểm thử

Dùng Vitest + Testing Library, theo cấu trúc test hiện có.

- **Mock (unit)**:
  - Chuyển trạng thái: các bước hợp lệ đi được; bước sai → 409; huỷ từ `delivering` → 409; đơn `awaiting_payment` và đơn quầy → 409.
  - Đơn quầy: tổng không cộng phí giao; tiền thối đúng; `cash_received` nhỏ hơn tổng → 422; `dine_in` thiếu bàn → 422; trùng `client_request_id` → trả đơn cũ.
  - Voucher: tạo thành công; trùng mã → 409; giá trị sai → 422; xoá xong thì validate báo không tồn tại; freeship tại quầy bị từ chối; `getOffers` chỉ lấy voucher `listed` còn hạn.
  - Hết hàng: chặn cả đơn khách lẫn đơn quầy; khách thấy `is_available:false`.
  - Báo cáo hôm nay: bỏ đơn huỷ, chờ thanh toán và đơn hôm qua; tách đúng theo nguồn và cách trả.
  - Token khách gọi `/staff/*` → 403; token hết hạn → 401.
  - Đơn cũ trong storage không có `status`/`source` vẫn đọc được.
- **Sửa test cũ**: các test phase 2–4 dựa vào việc trạng thái tự chạy theo thời gian sẽ chuyển sang đổi trạng thái qua staff store.
- **Component**:
  - `StaffRoute` chuyển hướng khi chưa đăng nhập; `returnTo` ngoài `/staff` thì bị bỏ.
  - Màn Bán hàng: thêm món qua hộp chọn; đổi SL; Tại bàn thiếu số bàn thì bị chặn; nút gợi ý tiền và tiền thối đúng; hoá đơn hiện sau khi đặt; "Đơn mới" reset.
  - Đơn online: mỗi trạng thái hiện đúng nút; 409 hiện thông báo.
  - Form voucher: kiểm tra từng ô; ẩn/hiện ô theo loại; 409 báo dưới ô mã.
  - Tồn kho: công tắc trả về như cũ khi lỗi.
  - Lịch sử: số liệu đúng; không có ô chọn ngày.
- **App**: `/staff/*` render trong `StaffLayout`; các route của khách không đổi.
- **Chạy tay**:
  - Mở hai tab: khách đặt đơn tiền mặt, nhân viên chuyển lần lượt từng bước, tab khách cập nhật trong ≤ 5 giây.
  - Tắt một món ở Tồn kho, tab khách thấy "Hết hàng".
  - Xem trước khi in của trình duyệt chỉ hiện phần hoá đơn.

## 10. README

Thêm mục "Trang nhân viên": bảng route `/staff/*`, tài khoản mẫu ở chế độ mock, hợp đồng API ở mục 5, và ghi chú rằng đơn mock không còn tự chuyển trạng thái nữa.
