# Frontend nhân viên (giai đoạn 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm khu `/staff/*` trong app hiện có để nhân viên bán tại quầy, chuyển trạng thái đơn online, tạo/xoá voucher, bật/tắt còn hàng, xem lịch sử và thống kê hôm nay, xem tài khoản.

**Architecture:** Cùng app React. Các route `/staff/*` có `StaffLayout` riêng và trang tải lười. Dữ liệu vẫn đi theo `component → hook → service → adapter (mock | http) → mapper`. Phiên nhân viên tách khỏi phiên khách: `request(..., { auth: 'staff' })` gửi token nhân viên, và khi lỗi 401/403 thì gọi một handler riêng cho phía nhân viên. Mock lưu trạng thái đơn, voucher, ghi đè còn/hết hàng và phiên nhân viên trong localStorage.

**Tech Stack:** React 19, react-router-dom 7, @tanstack/react-query 5, CSS Modules, Vitest 5 + Testing Library, jsdom.

**Spec:** `docs/superpowers/specs/2026-11-07-coffee-web-staff-design.md`. Đọc spec trước mỗi task; plan chỉ ghi các quyết định cần thiết để làm.

## Global Constraints

- Mọi chữ hiển thị đều bằng tiếng Việt. Tiền định dạng bằng `formatVnd`. Ngày định dạng `vi-VN`.
- Không thêm dependency mới.
- Desktop từ 1024px. Tông nâu chỉ dùng cho giao diện nhân viên, qua token mới trong `src/styles/tokens.css`. Màu cam `#fb8d17` của khách giữ nguyên.
- Component không bao giờ import từ `src/mocks/`. Đổi API thật chỉ cần sửa `src/api/adapters/httpAdapter.js` và `src/mappers/`.
- Request không gửi giá. Tổng, giảm giá, tiền thối, chuyển trạng thái và "hôm nay" do backend (mock) tính.
- Không ghi token ra log hay URL. Dữ liệu từ backend chỉ render dạng text.
- Thao tác phá huỷ (xoá voucher, huỷ đơn, xoá hết giỏ) có hộp xác nhận, focus sẵn vào "Không", bấm Esc thì đóng.
- Hằng số mới đặt trong `src/constants.js`:
  - `STAFF_SESSION_KEY = 'coffee-web:staff-session'`, `STAFF_CART_KEY = 'coffee-web:staff-cart'`
  - `MOCK_STAFF_SESSIONS_KEY = 'coffee-web:mock-staff-sessions'`, `MOCK_STAFF_PASSWORDS_KEY = 'coffee-web:mock-staff-passwords'`, `MOCK_VOUCHERS_KEY = 'coffee-web:mock-vouchers'`, `MOCK_AVAILABILITY_KEY = 'coffee-web:mock-availability'`
  - `TABLE_MAX = 20`, `VOUCHER_TITLE_MAX = 80`, `VOUCHER_DESCRIPTION_MAX = 200`
  - `CASH_ROUND_STEPS = [50000, 100000, 200000, 500000]`
- Tài khoản nhân viên mẫu (chỉ có trong mock, ghi vào README): `nhanvien@caphe.test` / `nhanvien123`, tên "Nhân viên Mẫu", role `staff`.
- Commit mỗi task: chỉ `git add` đúng các file của task đó, vì nhánh đang có nhiều file khác sửa dở chưa commit. Cuối commit message thêm `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Hai nhân viên cùng thao tác một đơn:** một người huỷ, người kia bấm "Giao hàng" theo dữ liệu cũ. Phải nhận 409, thẻ báo "Đơn đã được cập nhật bởi người khác", danh sách tải lại. Test nằm ở Task 4 (mock) và Task 8 (UI).
2. **Qua nửa đêm:** đơn tạo lúc 23:59 hôm qua không được tính vào báo cáo hôm nay hay danh sách hôm nay. Test ở Task 4.
3. **Khách và nhân viên đăng nhập trên cùng một trình duyệt:** API nhân viên trả 401 chỉ đăng xuất nhân viên, phiên khách còn nguyên; ngược lại cũng vậy. Test ở Task 3.
4. **Ô "Khách đưa" nhập sai:** để trống, có chữ, số âm, hoặc ít hơn tổng thì "Xác nhận" bị khoá và không gọi API. Gõ "100.000" thì hiểu là 100000. Test ở Task 7.
5. **Giỏ quầy còn lưu sau khi tải lại trang, trong đó có món vừa bị tắt:** đặt đơn nhận 422 "Món X đã hết", giỏ giữ nguyên, thông báo hiện trong hộp Thanh toán. Test ở Task 7.

---

## File Structure

```
src/constants.js                         (sửa) hằng mới, xoá STEP_*_MS
src/api/client.js                        (sửa) auth:'staff', staff unauthorized handler
src/api/adapters/mockAdapter.js          (sửa) đọc voucher/availability store, gộp staff methods
src/api/adapters/mockStaffMethods.js     (mới) mọi API /staff/* của mock
src/api/adapters/httpAdapter.js          (sửa) thêm các route staff
src/mocks/orderStore.js                  (sửa) status được lưu, transitionOrder, buildCounterOrder, isToday
src/mocks/voucherStore.js                (mới) CRUD voucher trên localStorage
src/mocks/availabilityStore.js           (mới) ghi đè is_available
src/mocks/staffStore.js                  (mới) nhân viên mẫu và phiên đăng nhập
src/mocks/voucherEngine.js               (sửa) tham số source
src/features/orders/orderStatus.js       (sửa) 'completed', NEXT_STATUS, CANCELLABLE
src/features/staff/session.js            (mới) đọc/ghi phiên nhân viên
src/features/staff/StaffAuthContext.jsx  (mới)
src/features/staff/validateVoucher.js    (mới) kiểm tra form tạo voucher
src/features/staff/cash.js               (mới) parseCash, cashSuggestions
src/features/cart/CartContext.jsx        (sửa) prop storageKey
src/features/cart/storage.js             (sửa) loadCart(key), saveCart(items, key)
src/mappers/order.js                     (sửa) trường mới; customer/address có thể null
src/mappers/staff.js                     (mới) toStaff, toStaffAuth, toStaffVoucher, toDailyReport, toCounterOrderRequest, toVoucherCreateRequest
src/services/staffService.js             (mới)
src/hooks/staff.js                       (mới) mọi hook của nhân viên
src/components/ProductModal.jsx          (sửa) export ProductForm, thêm prop submitLabel
src/components/ChangePasswordForm.jsx    (sửa) prop useMutationHook
src/components/ConfirmDialog.jsx         (mới)
src/staff/StaffRoute.jsx, StaffLayout.jsx(.module.css)
src/staff/pages/StaffLoginPage.jsx, PosPage.jsx, OnlineOrdersPage.jsx, VouchersPage.jsx,
                InventoryPage.jsx, HistoryPage.jsx, StaffAccountPage.jsx (+ .module.css)
src/staff/components/PaymentDialog.jsx, Receipt.jsx, OrderCard.jsx, VoucherForm.jsx, StatTiles.jsx
src/App.jsx                              (sửa) route /staff (lazy)
src/main.jsx, src/test/renderWithProviders.jsx (sửa) bọc StaffAuthProvider
src/styles/tokens.css                    (sửa) token tông nâu
README.md                                (sửa)
```

---

### Task 0: Chuẩn bị và lấy mốc test

- [ ] **Step 1:** Chạy `npm install`. Kết quả mong đợi: không có lỗi.
- [ ] **Step 2:** Chạy `npm test`. Ghi lại số test pass/fail làm mốc. Nếu có test fail sẵn trước khi sửa gì, báo người dùng và **dừng** trước khi làm Task 1.

---

### Task 1: Trạng thái đơn được lưu và chuyển bước

**Files:**
- Modify: `src/features/orders/orderStatus.js`, `src/mocks/orderStore.js`, `src/constants.js`, `src/mappers/order.js`
- Test: `src/mocks/orderStore.test.js`, `src/features/orders/orderStatus.test.js`, `src/mappers/order.test.js`, `src/api/adapters/mockOrders.test.js`

**Interfaces:**
- Produces:
  - `STATUS_LABELS.completed = 'Hoàn tất'`
  - `NEXT_STATUS = { placed: 'preparing', preparing: 'delivering', delivering: 'delivered' }`
  - `CANCELLABLE = ['placed', 'preparing']`
  - `canTransition(from, to) → boolean`
  - `computeOrderStatus(stored, now) → { status, paymentStatus }`: đọc `stored.status`; `status` thiếu thì coi là `'placed'`; với thanh toán online thì giữ cách tính hết hạn 5 phút như cũ
  - `transitionOrder(stored, next, now) → stored mới`; ném `ApiError(409, message)` khi bước không hợp lệ
  - `toRawOrder` trả thêm `source` (mặc định `'online'`), `service_type` (mặc định `'delivery'`), `table`, `cash_received`, `change` (mặc định null)
  - `toOrder` thêm `source`, `serviceType`, `table`, `cashReceived`, `change`. Với `source === 'counter'` thì `customer` và `address` là `null`

- [ ] **Step 1: Viết lại test bị ảnh hưởng và thêm test mới**
  - `orderStore.test.js`: xoá `it.each` theo mốc thời gian. Thêm:
    - `computeOrderStatus({ ...cash, status: 'preparing' }, t0 + 10 ** 9).status === 'preparing'` (thời gian trôi không làm đổi trạng thái)
    - Đơn tiền mặt không có `status` → `'placed'`
    - Đơn online đã trả (`paid_at` có) và không có `status` → `'placed'`
    - `transitionOrder` đi đúng từng bước của `NEXT_STATUS`; `placed→delivered` ném lỗi `status 409`; `delivering→cancelled` ném 409; `awaiting_payment→preparing` ném 409; đơn `source:'counter'` ném 409
  - `mockOrders.test.js`: các dòng 67–75 đổi kỳ vọng. Sau 15 giây đơn **vẫn** `placed`; sau `simulatePayment` là `placed`.
  - `orderStatus.test.js`: `canTransition('preparing','delivering') === true`, `canTransition('delivering','cancelled') === false`.
  - `order.test.js`: raw có `source:'counter', customer:null, address:null` thì map ra được, `customer === null`; raw online không có `source` → `source === 'online'`, `serviceType === 'delivery'`.
- [ ] **Step 2:** Chạy `npx vitest run src/mocks src/features/orders src/mappers/order.test.js src/api/adapters/mockOrders.test.js`. Kết quả mong đợi: FAIL ở các test mới.
- [ ] **Step 3: Cài đặt**
  - `buildStoredOrder` gán `status`: tiền mặt là `'placed'`, online là `'awaiting_payment'`. Gán `source:'online'`, `service_type:'delivery'`.
  - `simulatePayment` trong `mockAdapter` gán `status = 'placed'` cùng lúc với `paid_at`.
  - Xoá `stepAt` và `STEP_PLACED_MS`, `STEP_PREPARING_MS`, `STEP_DELIVERING_MS`.
  - Trong `toOrder`: nếu `source === 'counter'` thì `customer = null`, `address = null`; nếu không thì `requireField` như cũ.
- [ ] **Step 4:** Chạy `npm test`. Kết quả mong đợi: PASS toàn bộ, kể cả test UI phía khách (`OrderTrackingPage`, `OrderProgress`).
- [ ] **Step 5:** Commit: `feat: trạng thái đơn mock được lưu, thêm quy tắc chuyển bước`.

---

### Task 2: Store voucher, ghi đè còn/hết hàng, chặn món hết

**Files:**
- Create: `src/mocks/voucherStore.js`, `src/mocks/availabilityStore.js` (kèm `.test.js` cho mỗi file)
- Modify: `src/mocks/voucherEngine.js`, `src/mocks/orderStore.js` (`priceItem`), `src/api/adapters/mockAdapter.js`, `src/mappers/voucher.js` (`toVoucherRequest` nhận thêm `source`), `src/services/voucherService.js`, `src/hooks/useApplyVoucher.js`
- Test: `src/api/adapters/mockVouchers.test.js`, `src/mocks/voucherEngine.test.js`

**Interfaces:**
- Produces:
  - `loadVouchers() → raw voucher[]`: lần đầu (key chưa có) nạp dữ liệu từ `offers.js`
  - `saveVouchers(list)`
  - `loadAvailability() → { [productId]: boolean }`
  - `setAvailability(productId, isAvailable)`
  - `withAvailability(product) → product`: trả bản sao, đã áp ghi đè `is_available`
  - `evaluateVoucher(code, subtotal, deliveryFee, now, table, source = 'online')`: `source === 'counter'` với voucher `freeship` thì trả `{ ok:false, reason:'Mã chỉ áp dụng cho đơn giao hàng' }`
  - `validateVoucher({ code, items, source })`: service chỉ gửi `source` khi nó được truyền vào

- [ ] **Step 1: Viết test**
  - Tắt món `'bac-xiu'` thì `getProducts()` trả món đó với `is_available === false`, và `getProduct('bac-xiu')` cũng vậy.
  - `createOrder` có món đã tắt → `ApiError` status 422, message `'Món Bạc xỉu đã hết'`. Lấy đúng tên món từ `products.js`.
  - Món `cold-brew` (`is_available:false` sẵn trong dữ liệu) cũng bị 422.
  - `saveVouchers([])` thì `getOffers()` trả `[]` và `validateVoucher({code:'CHAO10',...})` trả `valid:false` "Mã giảm giá không tồn tại".
  - `evaluateVoucher('FREESHIP', 100000, 0, now, table, 'counter').ok === false`.
  - localStorage chứa JSON hỏng cho `MOCK_VOUCHERS_KEY` → cảnh báo bằng `console.warn` và dùng mảng rỗng, không crash.
- [ ] **Step 2:** Chạy `npx vitest run src/mocks src/api/adapters`. Kết quả mong đợi: FAIL.
- [ ] **Step 3: Cài đặt**
  - Đọc/ghi storage theo cách của `load`/`save` trong `authStore.js`.
  - `priceItem` dùng `withAvailability(product)`; `is_available === false` thì ném `invalid(\`Món ${product.name} đã hết\`)`.
  - `mockAdapter` dùng `loadVouchers()` ở `getOffers` và `validateVoucher`; đặt hàng truyền bảng voucher `loadVouchers()` làm tham số `table` của `evaluateVoucher`.
  - `getProducts` và `getProduct` map qua `withAvailability`.
- [ ] **Step 4:** Chạy `npm test`. Kết quả mong đợi: PASS.
- [ ] **Step 5:** Commit: `feat: voucher và còn hàng của mock lưu trong localStorage`.

---

### Task 3: Phiên nhân viên và API xác thực

**Files:**
- Create: `src/features/staff/session.js`, `src/mocks/staffStore.js`, `src/api/adapters/mockStaffMethods.js`, `src/mappers/staff.js`, `src/services/staffService.js` (kèm test cho từng file)
- Modify: `src/api/client.js`, `src/api/adapters/mockAdapter.js`, `src/api/adapters/httpAdapter.js`, `src/constants.js`
- Test: `src/api/client.test.js`, `src/api/adapters/httpAdapter.test.js`

**Interfaces:**
- Produces:
  - `readStaffSession()`, `saveStaffSession({token, expiresAt})`, `clearStaffSession()`, `getStaffToken()`: định dạng giống `features/auth/session.js`, dùng `STAFF_SESSION_KEY`
  - `client.js`:
    - `request(path, { auth: true | false | 'staff' })`. Với `'staff'` thì dùng `getStaffToken()`; nhận 401 hoặc 403 khi đã gửi token thì gọi `notifyStaffUnauthorized()`, và **không** gọi `notifyUnauthorized`
    - `setStaffUnauthorizedHandler(fn)`, `notifyStaffUnauthorized()`
  - `createStaffStore(now)`:
    - `login({email,password}) → {token, expires_at, staff}`; sai thì 401 `LOGIN_FAILED_TEXT`
    - `logout(token)`
    - `requireStaff(token)`: thiếu token, token sai hoặc hết hạn → 401 `NOT_LOGGED_IN_TEXT`; token của **khách** (có trong `MOCK_SESSIONS_KEY`) → 403 `'Bạn không có quyền truy cập trang nhân viên'`
    - `changePassword(token, {current_password, new_password})`
    - Nhân viên mẫu được tạo sẵn trong code (không qua localStorage). Mật khẩu sau khi đổi lưu ở `MOCK_STAFF_PASSWORDS_KEY`.
  - `createStaffMethods({ now, wait }) → { staffLogin, staffLogout, staffGetMe, staffChangePassword, ... }`. Mỗi method bọc giống `reportUnauthorized` nhưng dùng `getStaffToken` và `notifyStaffUnauthorized`, và áp cho cả 403.
  - http adapter:
    - `staffLogin` → `POST /staff/login` (`auth:false`)
    - `staffLogout` → `POST /staff/logout`
    - `staffGetMe` → `GET /staff/me`
    - `staffChangePassword` → `POST /staff/me/password`
    - Các route sau đều dùng `auth:'staff'`.
  - `toStaff(raw) → { id, name, email, role }`
  - `toStaffAuth(raw) → { token, expiresAt, staff }`
  - `staffService.login({email,password})`, `logout()`, `getMe()`, `changePassword({currentPassword,newPassword})`

- [ ] **Step 1: Viết test**
  - `client.test.js`: `request('/x', {auth:'staff'})` gửi header `Bearer <staff token>` chứ không phải token khách. Nhận 401 thì handler staff được gọi một lần và handler khách không được gọi. Nhận 403 cũng gọi handler staff.
  - `staffStore.test.js`:
    - login đúng → có token
    - sai mật khẩu → 401
    - email khách đã đăng ký → 401
    - `requireStaff(tokenKhach)` → 403
    - token hết hạn → 401
    - đổi mật khẩu xong thì login bằng mật khẩu mới được
  - `mockStaffMethods.test.js`: có cả phiên khách và phiên nhân viên; `staffGetMe` bị 401 thì `readSession()` (phiên khách) vẫn còn. (Review Focus 3)
  - `httpAdapter.test.js`: đường dẫn và method của 4 route trên.
- [ ] **Step 2:** Chạy `npx vitest run src/api src/mocks/staffStore.test.js src/features/staff`. Kết quả mong đợi: FAIL.
- [ ] **Step 3: Cài đặt** theo các Interfaces ở trên. `mockAdapter` spread `...createStaffMethods({ now, wait })` vào object trả về, **ngoài** `reportUnauthorized` của khách. Thêm tên các method staff vào cơ chế bọc riêng của staff.
- [ ] **Step 4:** Chạy `npm test`. Kết quả mong đợi: PASS.
- [ ] **Step 5:** Commit: `feat: phiên đăng nhập nhân viên tách khỏi khách`.

---

### Task 4: API nghiệp vụ của nhân viên (mock + http + service)

**Files:**
- Modify: `src/api/adapters/mockStaffMethods.js`, `src/mocks/orderStore.js`, `src/api/adapters/httpAdapter.js`, `src/mappers/staff.js`, `src/services/staffService.js`
- Test: `src/api/adapters/mockStaffMethods.test.js`, `src/mappers/staff.test.js`, `src/services/staffService.test.js`, `src/api/adapters/httpAdapter.test.js`

**Interfaces:**
- Consumes: `transitionOrder` (Task 1), `loadVouchers`/`saveVouchers`/`setAvailability`/`withAvailability` (Task 2), `requireStaff` (Task 3)
- Produces (mock method → http route; mọi route đều `auth:'staff'`):
  - `staffCreateOrder(body)` → `POST /staff/orders`
  - `staffGetOnlineOrders({status})` → `GET /staff/orders/online`
  - `staffUpdateOrderStatus(id, status)` → `PATCH /staff/orders/:id/status`
  - `staffGetTodayOrders()` → `GET /staff/orders/today`
  - `staffGetTodayReport()` → `GET /staff/reports/today`
  - `staffGetVouchers()`, `staffCreateVoucher(body)`, `staffDeleteVoucher(id)` → `/staff/vouchers`
  - `staffGetProducts()`, `staffSetAvailability(id, isAvailable)` → `/staff/products`
  - Trong `orderStore.js`:
    - `buildCounterOrder(request, now, staffId) → stored`: `source:'counter'`, `status:'completed'`, phí giao 0, `paid_at = created_at`, `customer:null`, `address:null`
    - `isToday(isoString, now) → boolean`: so `toDateString()` theo giờ máy (shortcut: múi giờ máy; backend thật dùng múi giờ quán)
    - `computeOrderStatus` với đơn `source:'counter'` trả `{ status:'completed', paymentStatus:'paid' }`
  - Mapper:
    - `toStaffVoucher(raw) → { id, code, title, description, type, value, maxDiscount, minOrder, expiresAt, listed }`
    - `toDailyReport(raw) → { date, orderCount, revenue, cancelledCount, bySource:{counter:{count,revenue}, online:{count,revenue}}, byPayment:{cash, bankTransfer, wallet} }`
    - `toCounterOrderRequest({ items, serviceType, table, voucherCode, paymentMethod, cashReceived, clientRequestId })`: dùng lại `toRequestItem`. `table` được trim, và là `null` khi `takeaway`. Chỉ gửi `cash_received` khi trả tiền mặt; chỉ gửi `voucher_code` khi có mã.
    - `toVoucherCreateRequest(form)`: `expires_at` = ngày đã chọn lúc 23:59:59.000 giờ địa phương, dạng `toISOString()`
  - `staffService`: `createCounterOrder`, `getOnlineOrders(status)`, `updateOrderStatus(id, status)`, `getTodayOrders`, `getTodayReport`, `getVouchers`, `createVoucher`, `deleteVoucher`, `getProducts`, `setAvailability`. Danh sách đi qua `mapList`.

- [ ] **Step 1: Viết test** (`mockStaffMethods.test.js`, với `now` cố định `t0`)
  - Đơn quầy tiền mặt (Bạc xỉu 30.000 × 2, `cash_received: 100000`) → `total 60000`, `change 40000`, `delivery_fee 0`, `status 'completed'`, `payment_status 'paid'`.
  - `cash_received: 50000` → 422. Thiếu `cash_received` khi trả tiền mặt → 422.
  - `dine_in` với `table: '  '` → 422. `takeaway` → `table` là `null`.
  - Gửi lại cùng `client_request_id` → trả cùng `id`, số đơn lưu không tăng.
  - Mã `GIAM20K` tại quầy với đơn 120.000 → `discount 20000`, `total 100000`. Mã `FREESHIP` → 422 với code `voucher_invalid`.
  - Đơn online `placed` → `preparing` → `delivering` → `delivered` qua `staffUpdateOrderStatus`.
  - Hai nhân viên: A huỷ đơn `preparing`, B gửi `delivering` → 409. (Review Focus 1)
  - `staffGetOnlineOrders({status:'placed'})` không có đơn quầy, không có đơn `awaiting_payment`, và không có đơn tạo hôm qua.
  - Báo cáo: tạo đơn online 129.000 tiền mặt, đơn quầy 60.000, một đơn huỷ, một đơn chờ thanh toán, và một đơn tạo lúc 23:59 hôm qua → `order_count 2`, `revenue 189000`, `cancelled_count 1`, `by_source.counter = {count:1, revenue:60000}`, `by_payment.cash = 189000`. (Review Focus 2)
  - Voucher:
    - tạo `{code:' tet-2027 ', type:'percent', value:10, ...}` → mã lưu là `'TET-2027'`
    - tạo trùng mã → 409
    - `value: 0` với loại `percent` → 422
    - `expires_at` ở quá khứ → 422
    - xoá → 204, sau đó `validateVoucher` báo không tồn tại
    - xoá id không có → 404
  - `staffSetAvailability('bac-xiu', false)` → `getProducts()` của khách thấy đã tắt.
  - Mọi method kể trên gọi bằng token khách → 403.
  - `mappers/staff.test.js`: `toVoucherCreateRequest` với ngày `'2027-01-31'` → `expires_at === new Date(2027, 0, 31, 23, 59, 59).toISOString()`. Bỏ phần tử voucher thiếu `code` khỏi danh sách (`mapList`).
- [ ] **Step 2:** Chạy `npx vitest run src/api src/mappers src/services`. Kết quả mong đợi: FAIL.
- [ ] **Step 3: Cài đặt** theo quy tắc ở spec mục 5.
  - Đơn quầy định giá bằng `priceItems` và voucher bằng `evaluateVoucher(..., 'counter')`.
  - Kiểm tra voucher theo đúng quy tắc ở spec mục 5. Chuẩn hoá mã bằng `normalizeVoucherCode`; định dạng mã kiểm bằng `isVoucherCode`.
- [ ] **Step 4:** Chạy `npm test`. Kết quả mong đợi: PASS.
- [ ] **Step 5:** Commit: `feat: API nhân viên cho đơn quầy, trạng thái, voucher, tồn kho, báo cáo`.

---

### Task 5: Khung giao diện nhân viên (auth, route, layout, đăng nhập)

**Files:**
- Create: `src/features/staff/StaffAuthContext.jsx`, `src/staff/StaffRoute.jsx`, `src/staff/StaffLayout.jsx` + `.module.css`, `src/staff/pages/StaffLoginPage.jsx`, `src/components/ConfirmDialog.jsx`
- Modify: `src/App.jsx`, `src/main.jsx`, `src/test/renderWithProviders.jsx`, `src/styles/tokens.css`, `src/features/cart/CartContext.jsx`, `src/features/cart/storage.js`, `src/features/auth/safeReturnTo.js`
- Test: `src/features/staff/StaffAuthContext.test.jsx`, `src/staff/StaffRoute.test.jsx`, `src/staff/pages/StaffLoginPage.test.jsx`, `src/components/ConfirmDialog.test.jsx`, `src/App.test.jsx`, `src/features/cart/storage.test.js`, `src/features/auth/safeReturnTo.test.js`

**Interfaces:**
- Consumes: `staffService.login/logout/getMe` (Task 3), `setStaffUnauthorizedHandler`
- Produces:
  - `StaffAuthProvider`, `useStaffAuth() → { status:'loading'|'anonymous'|'authenticated', staff, login(credentials), logout() }`: hành vi giống `AuthProvider` nhưng không có `register`
  - `<StaffRoute />`: chưa đăng nhập thì `Navigate` tới `/staff/login?returnTo=<encoded>`
  - `safeReturnTo(value, fallback = '/')`: thêm tham số `fallback`. Trang đăng nhập nhân viên chỉ nhận giá trị bắt đầu bằng `/staff`; không đạt thì dùng `'/staff'`
  - `<CartProvider storageKey={STAFF_CART_KEY}>`: mặc định vẫn là `CART_STORAGE_KEY`
  - `loadCart(key = CART_STORAGE_KEY)`, `saveCart(items, key = CART_STORAGE_KEY)`
  - `<ConfirmDialog open title message confirmLabel onConfirm onCancel />`: dùng `<dialog>`, focus vào nút "Không" khi mở, Esc gọi `onCancel`
  - `StaffLayout`: sidebar có 6 `NavLink` (Bán hàng `/staff` với `end`, Đơn online, Voucher, Tồn kho, Lịch sử, Tài khoản), thẻ nhân viên và nút "Đăng xuất". `<Outlet/>` nằm trong `RouteErrorBoundary`. Bên trong layout có `CartProvider storageKey={STAFF_CART_KEY}` bọc `<Outlet/>`.
  - `App.jsx`:
    - `<Route path="staff">` nằm **ngoài** `Layout` của khách
    - `login` tải lười
    - Các route con nằm trong `StaffRoute` > `StaffLayout`; mỗi page dùng `lazy(() => import(...))` bọc `<Suspense fallback={<Skeleton/>}>`
    - `path="*"` render `NotFoundPage`
    - Page chưa làm ở task này thì để component tạm chỉ trả về `<h1>` với tên trang; Task 7–11 thay bằng page thật

- [ ] **Step 1: Viết test**
  - `StaffRoute`: chưa có phiên, vào `/staff/vouchers` → location là `/staff/login?returnTo=%2Fstaff%2Fvouchers`.
  - Đăng nhập: điền tài khoản mẫu → vào `returnTo`. Sai mật khẩu → `role="alert"` "Email hoặc mật khẩu không đúng". `returnTo=/account` → vào `/staff`. Đã đăng nhập mà mở `/staff/login` → chuyển về `/staff`.
  - `App.test.jsx`: `/staff/...` không render Header của khách (không có link "Menu"); `/menu` vẫn có Header.
  - Phiên staff đang có, nhận 401 → `status` thành `'anonymous'`, phiên khách giữ nguyên.
  - `ConfirmDialog`: mở ra thì focus ở "Không"; Esc gọi `onCancel`.
  - `storage.test.js`: `saveCart(items, 'k2')` không ghi vào `CART_STORAGE_KEY`.
- [ ] **Step 2:** Chạy `npx vitest run src/staff src/features src/components/ConfirmDialog.test.jsx src/App.test.jsx`. Kết quả mong đợi: FAIL.
- [ ] **Step 3: Cài đặt** theo Interfaces.
  - Token nâu trong `tokens.css`: `--staff-bg`, `--staff-sidebar`, `--staff-accent`, `--staff-surface`, `--staff-text`, lấy từ ảnh tham khảo (nâu `#7a573f`, nền kem `#f3e6d6`).
  - `main.jsx` và `renderWithProviders` bọc thêm `StaffAuthProvider` bên trong `AuthProvider`.
- [ ] **Step 4:** Chạy `npm test` rồi `npm run build`. Kết quả mong đợi: PASS. Build tách ra chunk riêng cho các trang staff.
- [ ] **Step 5:** Commit: `feat: khung trang nhân viên, đăng nhập và phân quyền route`.

---

### Task 6: Tách ProductForm và cho ChangePasswordForm nhận hook

**Files:**
- Modify: `src/components/ProductModal.jsx`, `src/components/ChangePasswordForm.jsx`, `src/hooks/staff.js` (tạo mới)
- Test: `src/components/ProductModal.test.jsx`, `src/components/ChangePasswordForm.test.jsx`

**Interfaces:**
- Produces:
  - `export function ProductForm({ product, onDone, submitLabel = <nhãn hiện tại> })`: dùng `useCart()` của provider gần nhất, nên trong `StaffLayout` nó thêm vào giỏ quầy
  - `ChangePasswordForm({ useMutationHook = useChangePassword })`
  - `src/hooks/staff.js`:
    - Query: `useStaffProducts()`, `useOnlineOrders()` (không lọc, `refetchInterval: POLL_INTERVAL_MS`), `useTodayOrders()`, `useTodayReport()`, `useStaffVouchers()`
    - Mutation: `useCreateCounterOrder()`, `useUpdateOrderStatus()`, `useCreateVoucher()`, `useDeleteVoucher()`, `useSetAvailability()`, `useStaffChangePassword()`
    - Query key có tiền tố `['staff', ...]`. Mutation xong thì `invalidateQueries({ queryKey: ['staff'] })`; `useSetAvailability` và voucher còn invalidate thêm `['products']` và `['offers']`. Dùng đúng key mà `useProducts`/`useOffers` đang dùng.

- [ ] **Step 1: Viết test**
  - `ProductForm` render với `submitLabel="Thêm vào đơn"`: bấm nút thì `useCart().items` có 1 dòng.
  - `ChangePasswordForm` nhận `useMutationHook` giả: submit thì gọi `mutate` của hook giả.
  - Các test cũ của `ProductModal` vẫn PASS.
- [ ] **Step 2:** Chạy test. Kết quả mong đợi: FAIL.
- [ ] **Step 3:** Cài đặt.
- [ ] **Step 4:** Chạy `npm test`. Kết quả mong đợi: PASS.
- [ ] **Step 5:** Commit: `refactor: dùng lại ProductForm và ChangePasswordForm cho nhân viên; thêm hook staff`.

---

### Task 7: Màn Bán hàng, thanh toán và hoá đơn

**Files:**
- Create: `src/staff/pages/PosPage.jsx` + `.module.css`, `src/staff/components/PaymentDialog.jsx`, `src/staff/components/Receipt.jsx` + `.module.css`, `src/features/staff/cash.js`
- Test: `src/features/staff/cash.test.js`, `src/staff/pages/PosPage.test.jsx`

**Interfaces:**
- Consumes: `ProductForm`, `useStaffProducts`, `useCreateCounterOrder`, `VoucherBox`, `ConfirmDialog`, `QrPlaceholder`, `CategoryList`, `SearchBox`, `ProductCard`
- Produces:
  - `parseCash(text) → number | null`: bỏ dấu `.`, dấu `,` và khoảng trắng; chỉ còn chữ số và giá trị ≥ 0 thì trả số nguyên; ngược lại `null`
  - `cashSuggestions(total) → number[]`: gồm `total`, rồi `Math.ceil(total / s) * s` với mỗi `s` trong `CASH_ROUND_STEPS`; bỏ trùng; sắp tăng dần
  - `<Receipt order />`: phần tử gốc có `data-print="receipt"`
  - `VoucherBox` cần truyền `source:'counter'` cho hook. Thêm prop `source` vào `VoucherBox` và truyền xuống `useApplyVoucher`.

- [ ] **Step 1: Viết test**
  - `cash.test.js`:
    - `parseCash('100.000') === 100000`
    - `parseCash('') === null`, `parseCash('abc') === null`, `parseCash('-5') === null`
    - `cashSuggestions(60000)` bằng `[60000, 100000, 200000, 500000]`
    - `cashSuggestions(50000)` bằng `[50000, 100000, 200000, 500000]`
  - `PosPage.test.jsx` (đã có phiên staff, mock adapter với `latencyMs = 0`):
    - Món hết hàng (`cold-brew`) có nút bị disable.
    - Thêm Bạc xỉu qua hộp chọn → bảng giỏ có 1 dòng, "Thành tiền" là `30.000 ₫`. Bấm + → `60.000 ₫`.
    - "Tại bàn" với ô số bàn trống, bấm "Thanh toán" → lỗi dưới ô "Số bàn", hộp thanh toán không mở.
    - Tiền mặt: gõ `50.000` với tổng 60.000 → "Xác nhận" disabled. Bấm gợi ý `100.000 ₫` → "Tiền thối 40.000 ₫" và nút được bật. (Review Focus 4)
    - Xác nhận → hoá đơn hiện mã đơn, "Bàn 5", "Khách đưa 100.000 ₫", "Tiền thối 40.000 ₫". Bấm "In hoá đơn" thì gọi `window.print` (dùng spy).
    - "Đơn mới" → giỏ trống, quay về "Tại bàn".
    - "Xoá hết" → mở ConfirmDialog; bấm "Không" thì giỏ vẫn còn.
    - Giỏ có món đã bị tắt sau đó → xác nhận → `role="alert"` "Món Bạc xỉu đã hết" trong hộp, giỏ vẫn còn. (Review Focus 5)
    - Chuyển khoản → hiện QR và nút "Đã nhận chuyển khoản"; bấm thì tạo đơn với `payment_method:'bank_transfer'`.
- [ ] **Step 2:** Chạy `npx vitest run src/features/staff src/staff/pages/PosPage.test.jsx`. Kết quả mong đợi: FAIL.
- [ ] **Step 3: Cài đặt** theo spec mục 7, phần "Bán hàng".
  - Chữ ký giỏ và logic mã mất hiệu lực làm giống `CheckoutPage.jsx` (dòng 69–71).
  - `client_request_id` nằm trong `useRef(newRequestId())` và chỉ sinh lại khi bấm "Đơn mới".
  - `@media print`: ẩn mọi thứ trừ `[data-print="receipt"]`, rộng `80mm`.
  - Lỗi `voucher_invalid` thì bỏ mã đang áp và hiện "Mã không còn dùng được".
- [ ] **Step 4:** Chạy `npm test`. Kết quả mong đợi: PASS.
- [ ] **Step 5:** Commit: `feat: màn bán hàng tại quầy, thanh toán và in hoá đơn`.

---

### Task 8: Màn Đơn online

**Files:**
- Create: `src/staff/pages/OnlineOrdersPage.jsx` + `.module.css`, `src/staff/components/OrderCard.jsx`
- Test: `src/staff/pages/OnlineOrdersPage.test.jsx`

**Interfaces:**
- Consumes: `useOnlineOrders`, `useUpdateOrderStatus`, `NEXT_STATUS`, `CANCELLABLE`, `STATUS_LABELS`, `ConfirmDialog`
- Produces: nhãn nút chính theo trạng thái `{ placed:'Nhận đơn → pha chế', preparing:'Giao hàng', delivering:'Đã giao' }`

- [ ] **Step 1: Viết test**
  - Tab "Chờ xác nhận" hiện số đơn; bấm "Nhận đơn → pha chế" thì đơn chuyển sang tab "Đang pha chế".
  - Đơn `delivering` không có nút "Huỷ đơn".
  - "Huỷ đơn" → xác nhận → đơn vào tab "Đã xong" với nhãn "Đã huỷ".
  - Mutation trả 409 → thẻ hiện "Đơn đã được cập nhật bởi người khác" và danh sách được refetch. (Review Focus 1)
  - Không có đơn → "Không có đơn nào".
- [ ] **Step 2:** Chạy test. Kết quả mong đợi: FAIL.
- [ ] **Step 3:** Cài đặt. Gọi `useOnlineOrders()` một lần (không truyền `status`) rồi lọc theo tab ở phía client; số đếm của các tab tính từ cùng danh sách đó. Tab "Đã xong" = `delivered` + `cancelled`.
- [ ] **Step 4:** Chạy `npm test`. Kết quả mong đợi: PASS.
- [ ] **Step 5:** Commit: `feat: màn đơn online cho nhân viên`.

---

### Task 9: Màn Voucher

**Files:**
- Create: `src/staff/pages/VouchersPage.jsx` + `.module.css`, `src/staff/components/VoucherForm.jsx`, `src/features/staff/validateVoucher.js`
- Test: `src/features/staff/validateVoucher.test.js`, `src/staff/pages/VouchersPage.test.jsx`

**Interfaces:**
- Produces: `validateVoucherForm(form, today) → { valid, errors: { code?, title?, description?, value?, maxDiscount?, minOrder?, expiresOn? } }`. `form` gồm `{ code, title, description, type, value, maxDiscount, minOrder, expiresOn:'YYYY-MM-DD', listed }`, các số ở dạng chuỗi.

- [ ] **Step 1: Viết test**
  - `validateVoucherForm`:
    - mã `'ab'` → lỗi `code`
    - `percent` với value `'101'` → lỗi `value`
    - `fixed` với `'0'` → lỗi `value`
    - `freeship` với value để trống → hợp lệ
    - `expiresOn` bằng hôm nay → lỗi `expiresOn` (phải sau hôm nay)
    - tiêu đề 81 ký tự → lỗi `title`
  - `VouchersPage`:
    - bảng hiện `CHAO10` với "10% tối đa 30.000 ₫" và `HETHAN` với "Hết hạn"
    - tạo voucher hợp lệ thì dòng mới xuất hiện
    - trùng mã → "Mã đã tồn tại" dưới ô mã
    - chọn loại `freeship` thì ô "Giá trị" bị ẩn
    - xoá → ConfirmDialog với câu chữ đúng như spec → dòng biến mất
- [ ] **Step 2:** Chạy test. Kết quả mong đợi: FAIL.
- [ ] **Step 3:** Cài đặt. Form dùng `FormField`/`fieldProps`. Lỗi đầu tiên được focus như `ChangePasswordForm`.
- [ ] **Step 4:** Chạy `npm test`. Kết quả mong đợi: PASS.
- [ ] **Step 5:** Commit: `feat: màn quản lý voucher cho nhân viên`.

---

### Task 10: Màn Tồn kho và Lịch sử hôm nay

Hai màn được gộp chung một task vì cả hai đều chỉ đọc dữ liệu là chính và có ít logic.

**Files:**
- Create: `src/staff/pages/InventoryPage.jsx`, `src/staff/pages/HistoryPage.jsx`, `src/staff/components/StatTiles.jsx` (+ `.module.css`)
- Test: `src/staff/pages/InventoryPage.test.jsx`, `src/staff/pages/HistoryPage.test.jsx`

- [ ] **Step 1: Viết test**
  - Tồn kho:
    - tắt công tắc Bạc xỉu → `aria-checked="false"` và `getProducts()` của khách thấy món đã tắt
    - mutation lỗi → công tắc trả về `true` và có `role="alert"` "Không cập nhật được Bạc xỉu"
    - tìm "bac" (không dấu) vẫn ra Bạc xỉu
  - Lịch sử:
    - tiêu đề "Hôm nay, " kèm ngày theo `vi-VN`
    - thẻ số liệu hiện đúng số từ báo cáo dựng sẵn
    - không có `input[type="date"]`
    - bấm dòng đơn quầy → chi tiết có nút "In lại hoá đơn" (dùng `Receipt`)
    - danh sách rỗng → "Hôm nay chưa có đơn nào"
- [ ] **Step 2:** Chạy test. Kết quả mong đợi: FAIL.
- [ ] **Step 3:** Cài đặt. Công tắc dùng `<button role="switch" aria-checked>`; giao diện lạc quan thì giữ trong state cục bộ và trả về như cũ ở `onError`.
- [ ] **Step 4:** Chạy `npm test`. Kết quả mong đợi: PASS.
- [ ] **Step 5:** Commit: `feat: màn tồn kho và lịch sử hôm nay`.

---

### Task 11: Màn Tài khoản và README

**Files:**
- Create: `src/staff/pages/StaffAccountPage.jsx`
- Modify: `README.md`
- Test: `src/staff/pages/StaffAccountPage.test.jsx`

- [ ] **Step 1: Viết test**
  - Trang hiện "Nhân viên Mẫu", email và vai trò.
  - Đổi mật khẩu qua `useStaffChangePassword` → thông báo thành công.
  - "Đăng xuất" → về `/staff/login`.
- [ ] **Step 2:** Chạy test. Kết quả mong đợi: FAIL.
- [ ] **Step 3:** Cài đặt. Sau đó thêm vào README mục "Trang nhân viên" như spec mục 10: bảng route, tài khoản mẫu, hợp đồng API (chép từ spec mục 5), và ghi chú rằng đơn mock không còn tự chuyển trạng thái.
- [ ] **Step 4:** Chạy `npm test`. Kết quả mong đợi: PASS.
- [ ] **Step 5:** Commit: `feat: màn tài khoản nhân viên; docs: README trang nhân viên`.

---

### Task 12: Kiểm tra toàn bộ

- [ ] **Step 1:** Chạy `npm test` và `npm run build`. Kết quả mong đợi: tất cả PASS, build không lỗi.
- [ ] **Step 2:** Chạy `npm run dev` và mở hai tab:
  - Tab khách đặt đơn tiền mặt. Tab nhân viên chuyển lần lượt từng bước; tab khách cập nhật trong ≤ 5 giây.
  - Tắt một món ở Tồn kho; tab khách thấy "Hết hàng".
  - Bán một đơn tại quầy và mở xem trước khi in; chỉ thấy phần hoá đơn.
- [ ] **Step 3:** Ghi lại những gì đã kiểm tra tay và những gì chưa kiểm được để báo người dùng.
