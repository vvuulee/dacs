# Thiết kế giai đoạn 3: Tài khoản (đăng nhập email + mật khẩu, hồ sơ, lịch sử đơn)

Ngày: 2026-10-30 · Trạng thái: chờ duyệt · Dựa trên: spec giai đoạn 1 và 2 cùng thư mục

## 1. Mục tiêu và bối cảnh

Thêm tài khoản cho web đặt đồ uống desktop (React + Vite, JavaScript): đăng ký, đăng nhập, quên và đặt lại mật khẩu, hồ sơ (kèm một địa chỉ mặc định), đổi mật khẩu, lịch sử đơn. Đăng nhập là **tùy chọn**: khách vãng lai vẫn đặt hàng và tra đơn như giai đoạn 2.

Mục đích vẫn là **chuẩn bị nối backend thật** do người khác làm, hình dạng chưa biết. Tiêu chí thành công:

> Đổi sang API thật chỉ cần sửa adapter, mapper và hai module `session.js`, `client.js`; không sửa component giao diện. Mọi chi tiết về token nằm trong hai module đó.

## 2. Phạm vi

**Trong phạm vi:** các trang `/login`, `/register`, `/forgot-password`, `/reset-password`, `/account`, `/account/orders`; route cần đăng nhập; điền sẵn thông tin ở `/checkout`; xem đơn của chính mình không cần số điện thoại; tên tài khoản ở Header; mock backend cho xác thực.

**Ngoài phạm vi:** đăng nhập mạng xã hội, xác minh email, xác thực hai lớp, nhiều địa chỉ, "nhận đơn cũ về tài khoản" (đơn đặt lúc là khách vãng lai vẫn tra bằng mã đơn + số điện thoại), phân trang lịch sử đơn, đồng bộ đăng xuất giữa các tab, cửa hàng và ưu đãi (giai đoạn 4).

## 3. Giả định và quyết định đã chốt

- Phiên đăng nhập dùng **một token trong `localStorage`, không làm mới** (lựa chọn của chủ dự án, khác với đề xuất ban đầu là cookie httpOnly). Rủi ro: lộ token nếu có lỗi XSS; hết hạn thì phải đăng nhập lại. Giảm thiểu: token không bao giờ vào URL hay log, bị xóa khi đăng xuất hoặc gặp 401, khuyến nghị CSP cho backend/host. Chuyển sang cookie sau này chỉ sửa `session.js` và `client.js`.
- Hợp đồng API ở mục 7 chỉ là **giả định để người làm backend đối chiếu**.
- Mật khẩu trong mock chỉ băm đơn giản, **không phải mẫu bảo mật**; backend thật phải băm đúng chuẩn và giới hạn tốc độ thử mật khẩu.
- Giao diện bám phong cách giai đoạn 1–2 (tiếng Việt, cam `#fb8d17`, desktop từ 1024px).

## 4. Luồng và route

| Route | Nội dung |
|---|---|
| `/login` | Email + mật khẩu; link tới đăng ký và quên mật khẩu; hỗ trợ `?returnTo=`. Đã đăng nhập thì chuyển tới `returnTo` (hoặc `/`). |
| `/register` | Họ tên, email, mật khẩu, nhập lại mật khẩu. Thành công thì đăng nhập luôn và chuyển tới `returnTo` hoặc `/`. |
| `/forgot-password` | Nhập email; luôn báo "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu." |
| `/reset-password?token=` | Mật khẩu mới + nhập lại. Thiếu `token` hoặc `token` sai/hết hạn → "Liên kết không hợp lệ hoặc đã hết hạn" kèm link `/forgot-password`. Thành công thì báo và có link tới `/login`. |
| `/account` | Hồ sơ (họ tên, email chỉ đọc, số điện thoại, địa chỉ mặc định), đổi mật khẩu, link tới lịch sử đơn, nút "Đăng xuất". |
| `/account/orders` | Lịch sử đơn của tài khoản (mới nhất trước): mã đơn (link `/orders/:id`), ngày giờ, trạng thái, tổng tiền. Rỗng → "Bạn chưa có đơn nào". |

`/account` và `/account/orders` nằm sau `ProtectedRoute`: đang kiểm tra phiên thì hiện khung chờ (không nháy sang trang đăng nhập); chưa đăng nhập thì chuyển tới `/login?returnTo=<đường dẫn + query hiện tại, đã mã hóa>`.

**Header:** chưa đăng nhập hiện link "Đăng nhập" → `/login`; đã đăng nhập hiện "Tài khoản: <tên>" → `/account`. Trong lúc đang kiểm tra phiên không hiện gì thêm.

### Vòng đời phiên

1. Mở app: đọc phiên từ `localStorage`. Không có → khách vãng lai. Có nhưng `expiresAt` đã qua → xóa, khách vãng lai (không gọi API). Còn hạn → trạng thái `loading`, gọi `GET /me`: thành công → `authenticated`; 401 → xóa phiên, khách vãng lai; **lỗi mạng → giữ token, coi là khách vãng lai trong lần tải này** (tải lại sẽ thử lại).
2. Đăng nhập/đăng ký thành công: lưu phiên, đặt người dùng, **xóa cache truy vấn**.
3. Đăng xuất: xóa phiên cục bộ và cache **trước**, rồi gọi `POST /auth/logout` (lỗi mạng cũng không giữ khách ở trạng thái đăng nhập).
4. Gặp 401 trên request có kèm token: xóa phiên và cache, đặt cờ `sessionExpired = true`. Cờ này hiện thông báo "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại." ở `/login`, và được xóa khi đăng nhập thành công.

### Đặt hàng khi đã đăng nhập

- Trang `/checkout` tự điền họ tên, số điện thoại và địa chỉ từ hồ sơ **một lần**, khi hồ sơ có sẵn và khách chưa sửa ô nào; không bao giờ ghi đè dữ liệu khách đã gõ. Vẫn sửa được từng ô.
- Đơn được gắn vào tài khoản (request mang token). Đơn vẫn được lưu vào "đơn gần đây" như trước.
- Nếu token hết hạn đúng lúc đặt hàng: `POST /orders` trả 401 → phiên bị xóa, hiện "Phiên đăng nhập đã hết hạn. Bạn có thể đặt hàng tiếp như khách hoặc đăng nhập lại.", **giỏ và form còn nguyên**, `clientRequestId` giữ nguyên; bấm đặt lại thì gửi không kèm token (đơn khách vãng lai).

### Xem đơn của chính mình

Ở `/orders/:id` và `/payment/:id`: nếu có số điện thoại trong "đơn gần đây" thì dùng nó như giai đoạn 2. Nếu không có mà đã đăng nhập thì gọi không kèm số điện thoại (backend cho phép chủ đơn). Nếu vẫn 404 hoặc chưa đăng nhập thì hiện `PhoneGate`. Khóa cache của truy vấn đơn gồm cả `userId` (hoặc `guest`).

## 5. Kiến trúc

Giữ luồng: `component → hook → service → adapter (mock | http) → mapper → model`.

```
src/
  features/auth/   session.js, AuthContext.jsx, validate.js, safeReturnTo.js
  mappers/         user.js (toUser, toAuthResponse, toProfileRequest)
  services/        authService.js
  hooks/           useMyOrders, useUpdateProfile, useChangePassword, useForgotPassword, useResetPassword
  mocks/           authStore.js (người dùng, phiên, token đặt lại)
  components/      ProtectedRoute, PasswordField (nút hiện/ẩn mật khẩu), ProfileForm, ChangePasswordForm
  pages/           LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage, AccountPage, AccountOrdersPage
```

**Sửa phần có sẵn:** `api/client.js`, `api/adapters/{mock,http}Adapter.js`, `services/orderService.js` (`getOrder(id, phone?)`), `hooks/useOrder.js` và `useOrderAccess.js`, `pages/CheckoutPage.jsx`, `components/Header.jsx`, `App.jsx`, `main.jsx` (thêm `AuthProvider` bên trong `QueryClientProvider`, bên ngoài `BrowserRouter`).

### Module phiên (`session.js`)

`readSession(): {token, expiresAt} | null`, `saveSession(session): void`, `clearSession(): void`, `isSessionExpired(session, now = Date.now()): boolean` (`Date.parse(expiresAt) <= now`), `getToken(): string | null` (trả token đã lưu, **không kiểm tra hạn**; hạn chỉ kiểm lúc mở app, còn lúc đang chạy thì backend trả 401). Lưu `{version: 1, token, expiresAt}` khóa `coffee-web:session`; mọi đọc/ghi bọc `try/catch`; hỏng hoặc sai phiên bản → `null`.

### `client.js`

`request(path, {..., auth = true})`: có `auth` và có token thì thêm header `Authorization: Bearer <token>`. Login, register, forgot, reset truyền `auth: false`. `setUnauthorizedHandler(fn)`: khi phản hồi 401 **và** request đã gửi token thì gọi `fn()` một lần rồi vẫn ném `ApiError(401)` để trang tự hiển thị lỗi.

### `AuthContext`

Trạng thái `{status: 'loading' | 'anonymous' | 'authenticated', user, sessionExpired}`; hàm `login({email, password})`, `register({name, email, password})`, `logout()`, `setUser(user)`, `dismissExpired()`; hook `useAuth()`. Đăng ký hàm xử lý 401 với `client.js` khi mount. Xóa cache bằng `queryClient.clear()`.

## 6. Model nội bộ

```
User { id, name, email, phone, address }     // phone: '' nếu chưa có; address: null | { provinceId, wardId, street }
AuthResult { token, expiresAt, user }
```

- `toUser(raw)`: `id` thành chuỗi, `phone = raw.phone ?? ''`, `address` thô `{province_id, ward_id, street}` hoặc `null`. Thiếu `id`/`name`/`email` → ném lỗi nêu tên trường.
- `toAuthResponse(raw)`: thiếu `token` hoặc `expires_at` → ném lỗi.
- `toProfileRequest({name, phone, provinceId, wardId, street})` (dạng phẳng, khớp các ô của form): `name` cắt khoảng trắng; `phone` rỗng → `null`, ngược lại chuẩn hóa; cả ba ô địa chỉ rỗng → `address: null`, ngược lại `address: {province_id, ward_id, street}` (đường cắt khoảng trắng).

## 7. Hợp đồng API giả định (REST)

Chỉ để đối chiếu; mapper và adapter hấp thụ khác biệt. `(Bearer)` = cần `Authorization: Bearer <token>`.

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

- `user` thô: `{ id, name, email, phone: string | null, address: null | { province_id, ward_id, street } }`. `token` là chuỗi bất kỳ (opaque); `expires_at` là ISO 8601.
- Thay đổi API giai đoạn 2: `POST /orders` nhận thêm Bearer tùy chọn (có token hợp lệ thì gắn đơn vào tài khoản; token sai/hết hạn → 401). `GET /orders/:id`: với Bearer của chủ đơn thì **không cần `phone`**; còn lại vẫn cần mã + `phone`, sai một trong hai → 404 như nhau.

## 8. Mock backend xác thực

Dữ liệu trong `localStorage` của mock: `coffee-web:mock-users`, `coffee-web:mock-sessions`, `coffee-web:mock-resets`. Mock xác thực bằng cách đọc cùng `getToken()` mà `client.js` dùng. Hằng số trong `constants.js`: `SESSION_KEY`, `SESSION_VERSION = 1`, `MOCK_USERS_KEY`, `MOCK_SESSIONS_KEY`, `MOCK_RESETS_KEY`, `MOCK_SESSION_TTL_MS = 86400000`, `MOCK_RESET_TTL_MS = 900000`, `PASSWORD_MIN = 8`, `PASSWORD_MAX = 128`, `EMAIL_MAX = 254`, `MY_ORDERS_MAX = 50`.

| Thao tác | Hành vi của mock |
|---|---|
| register | Kiểm tra họ tên 2–60, email đúng định dạng, mật khẩu 8–128, sai → 422. Email (không phân biệt hoa thường, cắt khoảng trắng) đã có → 409 "Email đã được đăng ký". Thành công → tạo người dùng và phiên. |
| login | Email không tồn tại và sai mật khẩu đều → 401 "Email hoặc mật khẩu không đúng". |
| me, updateMe, changePassword, getMyOrders, logout | Token thiếu, không có trong bảng phiên hoặc quá hạn → 401 "Chưa đăng nhập hoặc phiên đã hết hạn" (phiên quá hạn bị xóa). `updateMe`: tên 2–60, số điện thoại `null` hoặc đúng định dạng, địa chỉ `null` hoặc mã tỉnh/phường hợp lệ, sai → 422. `changePassword`: mật khẩu hiện tại sai → 422 "Mật khẩu hiện tại không đúng"; mật khẩu mới ngắn → 422. `logout`: xóa phiên; không có token vẫn trả thành công. |
| forgotPassword | Luôn thành công. Nếu email có tài khoản thì tạo token đặt lại (thay token cũ), hạn `MOCK_RESET_TTL_MS`. |
| resetPassword | Token sai/hết hạn/đã dùng → 400 "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn"; mật khẩu mới ngắn → 422. Thành công → đổi mật khẩu, xóa token **và hủy mọi phiên của người đó**. |
| createOrder | Có token nhưng không hợp lệ/quá hạn → 401. Token hợp lệ → lưu `user_id` vào đơn. Không token → đơn khách vãng lai. |
| getOrder | Chủ đơn (token hợp lệ, `user_id` khớp) xem được không cần `phone`; các trường hợp khác cần `phone` khớp, sai → 404 cùng thông báo như giai đoạn 2. |
| getMyOrders | Đơn có `user_id` của người dùng, mới nhất trước, tối đa `MY_ORDERS_MAX`, trạng thái tính như giai đoạn 2. |

Mock có thêm hàm **chỉ dành cho mock**: `peekResetToken(email): string | null` để trang quên mật khẩu hiện "hộp thư giả lập" (`aria-label="Hộp thư giả lập"`) với link `/reset-password?token=...`. Hộp này chỉ hiện khi `env.apiMode === 'mock'`; `authService` ném lỗi nêu "mock" nếu adapter không có hàm này.

## 9. Kiểm tra form

| Form | Quy tắc |
|---|---|
| Email | cắt khoảng trắng, khớp `^[^\s@]+@[^\s@]+\.[^\s@]+$`, tối đa 254 ký tự |
| Mật khẩu | 8–128 ký tự (không đòi ký tự đặc biệt); nhập lại phải khớp |
| Đăng ký | họ tên 2–60 (dùng `NAME_MIN`/`NAME_MAX`) |
| Hồ sơ | họ tên 2–60; số điện thoại tùy chọn nhưng nếu nhập thì đúng định dạng di động; địa chỉ: hoặc để trống cả ba ô (tỉnh, phường, đường), hoặc điền đủ cả ba (đường 5–120 ký tự) |
| Đổi mật khẩu | mật khẩu hiện tại bắt buộc; mật khẩu mới 8–128, khớp nhập lại, **khác** mật khẩu hiện tại |

`safeReturnTo(value): string` chỉ nhận chuỗi bắt đầu bằng `/` và không bắt đầu bằng `//`, không chứa `\` hay ký tự điều khiển; còn lại trả `/`. Lỗi hiện dưới từng ô (tái dùng `FormField`), focus ô sai đầu tiên; nút gửi bị vô hiệu khi đang gửi.

## 10. Xử lý lỗi

- 401 khi đăng nhập hiện "Email hoặc mật khẩu không đúng"; 429 hiện thông điệp của backend; 409 khi đăng ký hiện dưới ô email.
- Hồ sơ/đổi mật khẩu thành công: `role="status"` ("Đã lưu", "Đã đổi mật khẩu") và đổi mật khẩu xong xóa trắng ba ô; lỗi: `role="alert"`.
- Lịch sử đơn lỗi tải → `ErrorState` kèm Thử lại.
- Token không bao giờ nằm trong URL, log, thông báo lỗi hay `data-*`; mật khẩu không được lưu hay ghi log ở đâu cả.

## 11. Kiểm thử

- **Unit:** `session.js` (hỏng, sai phiên bản, hết hạn, ghi lỗi); `safeReturnTo` (bảng: `/menu`, `/account?x=1` hợp lệ; `//evil.com`, `https://evil.com`, `/\evil`, `javascript:alert(1)`, chuỗi rỗng, `null` → `/`); kiểm tra form (bảng); `toUser`, `toAuthResponse`, `toProfileRequest`; `client.js` (gắn Bearer khi có token, không gắn khi `auth: false`, gọi hàm 401 đúng một lần và chỉ khi request có token); toàn bộ bảng hành vi mock ở mục 8.
- **Component:** đăng nhập (thành công và quay về `returnTo`, sai thông tin, kiểm tra form, thông báo hết phiên); đăng ký (thành công, email trùng); quên mật khẩu (mock hiện hộp thư giả lập; email không tồn tại không hiện link) và đặt lại mật khẩu (thiếu token, token sai, thành công); `ProtectedRoute` (khung chờ, chuyển hướng kèm `returnTo`); trang tài khoản (điền sẵn, lưu hồ sơ, đổi mật khẩu, đăng xuất xóa cache và về `/`); lịch sử đơn (thứ tự, rỗng, link); Header; `/checkout` (điền sẵn từ hồ sơ, không ghi đè dữ liệu đã gõ, hết phiên giữa lúc đặt vẫn đặt tiếp như khách và giữ giỏ/form); `/orders/:id` của chính mình không cần số điện thoại, đơn người khác vẫn hỏi `PhoneGate`; `AuthProvider` (token còn hạn → `authenticated`; hết hạn → khách không gọi API; `GET /me` 401 → khách; lỗi mạng → giữ token).

## 12. Tiêu chí hoàn thành

- `npm test` và `npm run build` chạy sạch, không cảnh báo mới (cả `VITE_API_MODE=http`).
- Luồng đăng ký → đặt hàng khi đã đăng nhập → thấy đơn trong lịch sử → đăng xuất → đăng nhập lại chạy với dữ liệu mẫu; quên và đặt lại mật khẩu chạy được qua hộp thư giả lập.
- Tải lại trang giữa chừng vẫn giữ phiên; token hết hạn không làm mất giỏ hay form.
- Đổi `VITE_API_MODE=http` chỉ cần cung cấp URL và chỉnh mapper/adapter; không sửa component.

## 13. Rủi ro còn lại

- Token trong `localStorage` bị lộ nếu có lỗi XSS (đã chấp nhận; nên có CSP); không làm mới nên hết hạn là phải đăng nhập lại.
- Báo "email đã được đăng ký" làm lộ email nào có tài khoản (đánh đổi thông thường); chống dò mật khẩu và giới hạn tốc độ là việc của backend; chưa xác minh email.
- Hai tab không đồng bộ đăng xuất ngay; lần gọi API kế tiếp nhận 401 và tự xử lý.
- Hợp đồng API thật chưa biết: định dạng lỗi, thời hạn token, cách gắn đơn vào tài khoản có thể khác giả định.
- Lịch sử đơn chưa phân trang; giao diện chưa được xem bằng mắt trong trình duyệt (như giai đoạn 1–2).
