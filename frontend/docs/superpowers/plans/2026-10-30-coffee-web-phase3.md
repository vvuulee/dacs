# Coffee Web Giai đoạn 3 (Tài khoản) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm đăng ký, đăng nhập (email + mật khẩu), quên/đặt lại mật khẩu, hồ sơ với một địa chỉ mặc định, đổi mật khẩu và lịch sử đơn; đăng nhập là tùy chọn, khách vãng lai vẫn đặt hàng như cũ.

**Architecture:** Giữ luồng `component → hook → service → adapter (mock | http) → mapper → model`. Phiên là một token trong `localStorage` (module `session.js`), `client.js` tự gắn Bearer và báo 401 cho `AuthContext`; mock đóng vai backend xác thực bằng cách đọc cùng `getToken()`.

**Tech Stack:** như giai đoạn 1–2 (React, Vite, React Router, TanStack Query v5, CSS Modules, Vitest + Testing Library). Không thêm dependency.

**Spec:** `docs/superpowers/specs/2026-10-30-coffee-web-phase3-design.md` (nền: spec giai đoạn 1, 2). Nhánh: `feat/phase3`. Làm việc trong `/home/claude/coffee-web` (thư mục outputs không hỗ trợ symlink nên `npm install` hỏng ở đó); xong thì đồng bộ về outputs, bỏ `node_modules`.

## Global Constraints

- Giao diện tiếng Việt, cam `#fb8d17`, desktop từ 1024px; màu/khoảng cách dùng tokens trong `src/styles/tokens.css`. Không thêm dependency.
- Hằng số mới trong `src/constants.js`: `SESSION_KEY='coffee-web:session'`, `SESSION_VERSION=1`, `MOCK_USERS_KEY='coffee-web:mock-users'`, `MOCK_SESSIONS_KEY='coffee-web:mock-sessions'`, `MOCK_RESETS_KEY='coffee-web:mock-resets'`, `MOCK_SESSION_TTL_MS=86400000`, `MOCK_RESET_TTL_MS=900000`, `PASSWORD_MIN=8`, `PASSWORD_MAX=128`, `EMAIL_MAX=254`, `MY_ORDERS_MAX=50`.
- Token chỉ được đọc/ghi trong `src/features/auth/session.js` (mock đọc qua `getToken()`); token **không bao giờ** vào URL, log, thông báo lỗi hay `data-*`; mật khẩu không được lưu hay log ở đâu (kể cả mock chỉ lưu băm đơn giản, ghi chú "không phải mẫu bảo mật").
- Xóa cache khi đăng nhập/đăng ký/đăng xuất/hết phiên bằng `queryClient.removeQueries()` (không dùng `clear()`: nó xóa luôn mutation đang chạy, làm mất trạng thái lỗi của form).
- Đăng nhập tùy chọn: khách vãng lai đặt hàng và tra đơn bằng mã + SĐT như giai đoạn 2. Chỉ `/account`, `/account/orders` cần đăng nhập.
- Email so khớp không phân biệt hoa thường, cắt khoảng trắng. Mật khẩu 8–128 ký tự, không đòi ký tự đặc biệt.
- Chuỗi thông báo dùng chung đặt trong `src/features/auth/messages.js` (Task 1): `LOGIN_FAILED_TEXT='Email hoặc mật khẩu không đúng'`, `EMAIL_TAKEN_TEXT='Email đã được đăng ký'`, `NOT_LOGGED_IN_TEXT='Chưa đăng nhập hoặc phiên đã hết hạn'`, `SESSION_EXPIRED_TEXT='Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'`, `CHECKOUT_SESSION_EXPIRED_TEXT='Phiên đăng nhập đã hết hạn. Bạn có thể đặt hàng tiếp như khách hoặc đăng nhập lại.'`, `RESET_LINK_INVALID_TEXT='Liên kết không hợp lệ hoặc đã hết hạn'`, `FORGOT_SENT_TEXT='Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.'`, `CURRENT_PASSWORD_WRONG_TEXT='Mật khẩu hiện tại không đúng'`.
- Code theo `coding-hieu-qua` (không magic number, early return, không nuốt lỗi); task giao diện đọc `frontend-design` (focus nhìn thấy được, `prefers-reduced-motion`). Tái dùng `FormField`/`fieldProps`, `AddressFields`, `ErrorState`, `EmptyState`, `Skeleton`.
- Ngoài phạm vi: đăng nhập mạng xã hội, xác minh email, nhiều địa chỉ, nhận đơn cũ về tài khoản, phân trang lịch sử, đồng bộ đăng xuất giữa tab, cửa hàng/ưu đãi.

## Review Focus

1. Token hết hạn đúng lúc đặt hàng: giỏ và form còn nguyên, hiện `CHECKOUT_SESSION_EXPIRED_TEXT`, đặt lại thì tạo đơn **không** gắn tài khoản (Task 12).
2. Đăng nhập với email không tồn tại và với sai mật khẩu cho cùng status 401 và cùng thông báo (Tasks 4, 8).
3. Token đặt lại mật khẩu dùng một lần, và đặt lại xong thì mọi phiên cũ của người đó bị hủy (Task 4).
4. `returnTo` độc hại (`//evil.com`, `https://evil.com`, `/\evil`, `javascript:`) bị bỏ, quay về `/` (Tasks 1, 8).
5. Đăng xuất hoặc hết phiên xóa cache: người dùng sau không thấy lịch sử đơn/hồ sơ của người trước (Tasks 7, 10).

---

### Task 1: Nền tảng thuần (hằng số, thông báo, phiên, returnTo, kiểm tra form)

**Files:**
- Modify: `src/constants.js`
- Create: `src/features/auth/messages.js`, `session.js`, `safeReturnTo.js`, `validate.js` (cùng thư mục `src/features/auth/`)
- Test: `src/features/auth/session.test.js`, `safeReturnTo.test.js`, `validate.test.js`

**Interfaces:**
- Consumes: `NAME_MIN`, `NAME_MAX`, `STREET_MIN`, `STREET_MAX`, `isValidPhone` (`src/lib/phone.js`), `PHONE_ERROR` (`src/features/checkout/validate.js`).
- Produces `session.js`: `readSession(): {token: string, expiresAt: string} | null`; `saveSession(session): void`; `clearSession(): void`; `isSessionExpired(session, now = Date.now()): boolean` (`Date.parse(expiresAt) <= now`); `getToken(): string | null` (token đã lưu, **không kiểm tra hạn**). Lưu `{version: 1, token, expiresAt}` khóa `SESSION_KEY`; mọi đọc/ghi bọc `try/catch`; hỏng/sai version/thiếu trường → `null` + `console.warn` (không in token).
- Produces `safeReturnTo(value: unknown): string`: chỉ nhận chuỗi bắt đầu bằng `/`, không bắt đầu bằng `//`, không chứa `\` hay ký tự điều khiển (`\u0000-\u001f`); còn lại `'/'`.
- Produces `validate.js` (mỗi hàm trả `{valid: boolean, errors: Partial<Record<field,string>>}`): `validateLogin({email, password})` (email, password); `validateRegister({name, email, password, confirm})`; `validateProfile({name, phone, provinceId, wardId, street})`; `validateChangePassword({current, next, confirm})`; `validateReset({password, confirm})`. Thông điệp: email `'Nhập email hợp lệ'` (khớp `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` sau trim, ≤ `EMAIL_MAX`); login password rỗng `'Nhập mật khẩu'`; mật khẩu mới/đăng ký/đặt lại `'Mật khẩu từ 8 đến 128 ký tự'`; confirm `'Mật khẩu nhập lại không khớp'`; name `'Nhập họ tên từ 2 đến 60 ký tự'`; current `'Nhập mật khẩu hiện tại'`; next trùng current `'Mật khẩu mới phải khác mật khẩu hiện tại'`. Hồ sơ: phone tùy chọn (rỗng ok, nhập thì `isValidPhone` hoặc `PHONE_ERROR`); địa chỉ: cả ba ô rỗng ok, có một ô thì cần đủ: `provinceId` `'Chọn tỉnh/thành'`, `wardId` `'Chọn phường/xã'`, `street` `'Nhập số nhà và tên đường (5–120 ký tự)'`.

- [ ] **Step 1: Write the failing tests**

```js
// session (localStorage.clear() mỗi test, console.warn bị spy)
it('save rồi read trả lại giống hệt', () => { saveSession({ token: 't1', expiresAt: '2026-11-01T00:00:00.000Z' }); expect(readSession()).toEqual({ token: 't1', expiresAt: '2026-11-01T00:00:00.000Z' }); });
it('chưa có → null', () => expect(readSession()).toBeNull());
it('JSON hỏng / sai version / thiếu token → null và warn không chứa token', () => { /* ba giá trị lưu sẵn; expect readSession() null; expect(JSON.stringify(console.warn.mock.calls)).not.toContain('secret-token') */ });
it('isSessionExpired: đúng mốc hết hạn là hết hạn', () => { const s = { token: 't', expiresAt: new Date(1000).toISOString() }; expect(isSessionExpired(s, 999)).toBe(false); expect(isSessionExpired(s, 1000)).toBe(true); });
it('getToken trả token đã lưu kể cả khi đã quá hạn; clearSession → null', () => { saveSession({ token: 'old', expiresAt: '2000-01-01T00:00:00.000Z' }); expect(getToken()).toBe('old'); clearSession(); expect(getToken()).toBeNull(); });
it('setItem ném QuotaExceededError → saveSession không ném', ...);
// safeReturnTo (Review Focus 4)
it.each(['/menu', '/account?x=1', '/orders/CF1#a'])('%s hợp lệ', v => expect(safeReturnTo(v)).toBe(v));
it.each(['//evil.com', 'https://evil.com', '/\\evil', 'javascript:alert(1)', '', null, undefined, 42, '/a\nb'])('%s → "/"', v => expect(safeReturnTo(v)).toBe('/'));
// validate
it('login: email sai và mật khẩu rỗng → hai lỗi đúng thông điệp', ...);
it('register: mật khẩu 7 ký tự lỗi, 8 ok, 129 lỗi; confirm lệch lỗi; tên 1 ký tự lỗi; email 255 ký tự lỗi', ...);
it('profile: phone rỗng ok; "123" → PHONE_ERROR; địa chỉ rỗng cả ba ok; chỉ có tỉnh → lỗi wardId và street', ...);
it('changePassword: next trùng current lỗi; current rỗng lỗi', ...);
it('reset: khớp ok, lệch lỗi confirm', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/features/auth` → FAIL.
- [ ] **Step 3: Implement** theo Interfaces; thêm hằng số vào `constants.js`; `messages.js` xuất đúng các chuỗi ở Global Constraints.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: nền tảng tài khoản (phiên, returnTo, kiểm tra form)`

### Task 2: Mapper người dùng

**Files:**
- Create: `src/mappers/user.js`
- Test: `src/mappers/user.test.js`

**Interfaces:**
- Consumes: `requireField` (`src/mappers/shared.js`), `normalizePhone`.
- Produces: `toUser(raw): {id: string, name, email, phone: string, address: null | {provinceId, wardId, street}}` (`phone = raw.phone ?? ''`; thiếu `id`/`name`/`email` → ném lỗi nêu tên trường); `toAuthResponse(raw): {token, expiresAt, user}` (thiếu `token` hoặc `expires_at` → ném lỗi nêu tên trường); `toProfileRequest({name, phone, provinceId, wardId, street}): {name, phone: string | null, address: null | {province_id, ward_id, street}}` (name/street cắt khoảng trắng; phone rỗng → `null` còn lại `normalizePhone`; cả ba ô địa chỉ rỗng → `address: null`).

- [ ] **Step 1: Write the failing tests**

```js
it('toUser map snake_case, id số → chuỗi', () => expect(toUser({ id: 7, name: 'An', email: 'a@x.vn', phone: '0901234567', address: { province_id: 'hn', ward_id: 'hn-1', street: '12 Lê Lợi' } })).toEqual({ id: '7', name: 'An', email: 'a@x.vn', phone: '0901234567', address: { provinceId: 'hn', wardId: 'hn-1', street: '12 Lê Lợi' } }));
it('phone null → "" và address null giữ null', () => expect(toUser({ id: 1, name: 'An', email: 'a@x.vn', phone: null, address: null })).toMatchObject({ phone: '', address: null }));
it.each(['id', 'name', 'email'])('thiếu %s ném lỗi nêu tên', f => expect(() => toUser({ id: 1, name: 'A', email: 'a@x.vn', [f]: undefined })).toThrow(new RegExp(f)));
it('toAuthResponse', () => expect(toAuthResponse({ token: 'tk', expires_at: '2026-11-01T00:00:00.000Z', user: rawUser })).toMatchObject({ token: 'tk', expiresAt: '2026-11-01T00:00:00.000Z', user: { id: '1' } }));
it.each(['token', 'expires_at'])('toAuthResponse thiếu %s ném lỗi', f => expect(() => toAuthResponse({ ...rawAuth, [f]: undefined })).toThrow(new RegExp(f)));
it('toProfileRequest chuẩn hóa', () => expect(toProfileRequest({ name: ' An ', phone: '+84 901 234 567', provinceId: 'hn', wardId: 'hn-1', street: ' 12 Lê Lợi ' })).toEqual({ name: 'An', phone: '0901234567', address: { province_id: 'hn', ward_id: 'hn-1', street: '12 Lê Lợi' } }));
it('toProfileRequest: phone rỗng → null, địa chỉ rỗng → null', () => expect(toProfileRequest({ name: 'An', phone: '', provinceId: '', wardId: '', street: '' })).toEqual({ name: 'An', phone: null, address: null }));
```

- [ ] **Step 2: Run** `npx vitest run src/mappers/user.test.js` → FAIL.
- [ ] **Step 3: Implement** ba hàm trong `src/mappers/user.js`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: mapper người dùng`

### Task 3: `client.js` (Bearer, 401, 204/202)

**Files:**
- Modify: `src/api/client.js`
- Test: `src/api/client.test.js`

**Interfaces:**
- Consumes: `getToken` (`src/features/auth/session.js`).
- Produces: `request(path, { baseUrl, params, signal, method = 'GET', body, auth = true })` — `auth` và `getToken()` có giá trị thì thêm header `Authorization: Bearer <token>` (gộp với `Content-Type` khi có body); `setUnauthorizedHandler(fn: (() => void) | null): void` — phản hồi 401 **và** request đã gửi token thì gọi handler đúng một lần rồi vẫn ném `ApiError(401, ...)`; phản hồi `204` trả `null` không đọc body; phản hồi `202` có body rỗng/không phải JSON cũng trả `null`; các trạng thái ok khác giữ hành vi cũ (body không phải JSON → `ApiError(status, 'Phản hồi không hợp lệ')`).

- [ ] **Step 1: Write the failing tests** (thêm vào file hiện có; `saveSession`/`clearSession` để đặt token)

```js
it('gắn Authorization Bearer khi có token', async () => { saveSession({ token: 'tk-1', expiresAt: '2099-01-01T00:00:00.000Z' }); /* fetch mock */ await request('/me', { baseUrl: '/api' }); expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tk-1'); });
it('auth:false không gắn Bearer dù có token', async () => { /* ... */ expect(fetchMock.mock.calls[0][1].headers?.Authorization).toBeUndefined(); });
it('không có token thì không có header Authorization', ...);
it('POST có body: giữ Content-Type và gắn Bearer cùng lúc', ...);
it('401 khi request có token: gọi handler đúng một lần và vẫn ném ApiError 401', async () => { const handler = vi.fn(); setUnauthorizedHandler(handler); /* 401 */ await expect(request('/me', { baseUrl: '/api' })).rejects.toMatchObject({ status: 401 }); expect(handler).toHaveBeenCalledTimes(1); });
it('401 khi không gửi token (hoặc auth:false): không gọi handler', ...);
it('204 → null', ...);   it('202 body rỗng → null', ...);   it('200 body không phải JSON vẫn ném ApiError', ...);
afterEach: setUnauthorizedHandler(null); clearSession();
```

- [ ] **Step 2: Run** `npx vitest run src/api/client.test.js` → FAIL.
- [ ] **Step 3: Implement** theo Interfaces (handler lưu ở biến module).
- [ ] **Step 4: Run** `npx vitest run` → PASS toàn bộ.
- [ ] **Step 5: Commit** `feat: client gắn Bearer, xử lý 401 và 204/202`

### Task 4: Mock xác thực (`authStore`) và adapter mock

**Files:**
- Create: `src/mocks/authStore.js`
- Modify: `src/api/adapters/mockAdapter.js`
- Test: `src/mocks/authStore.test.js`, `src/api/adapters/mockAuth.test.js`

**Interfaces:**
- Consumes: `ApiError`, `normalizePhone`, `isValidPhone`, `provinces`/`wardsByProvince` (`src/mocks/addresses.js`), hằng số mock, `messages.js`, `getToken`.
- Produces `authStore.js`: `createAuthStore(now: () => number = () => Date.now())` trả `{ register(body), login(body), logout(token), requireUser(token), toRawUser(user), updateProfile(token, body), changePassword(token, body), forgotPassword(body), resetPassword(body), peekResetToken(email) }`. `register`/`login` trả `{ token, expires_at, user: rawUser }`; `requireUser(token)` trả người dùng đã lưu hoặc ném `ApiError(401, NOT_LOGGED_IN_TEXT)` (token thiếu/không có/quá hạn; phiên quá hạn bị xóa); `toRawUser(user)` → `{id, name, email, phone, address}` thô (không có mật khẩu). Dữ liệu trong `localStorage` khóa `MOCK_USERS_KEY`, `MOCK_SESSIONS_KEY`, `MOCK_RESETS_KEY` (hỏng → rỗng + warn). Băm mật khẩu: hàm FNV đơn giản theo `email + password`, chú thích "chỉ cho mock".
- Quy tắc theo spec mục 8: `register` kiểm tra tên 2–60, email đúng định dạng, mật khẩu 8–128 (sai → `ApiError(422)`); email trùng → `ApiError(409, EMAIL_TAKEN_TEXT)`. `login` sai email hoặc sai mật khẩu → cùng `ApiError(401, LOGIN_FAILED_TEXT)`. `updateProfile`: tên 2–60, phone `null` hoặc `isValidPhone`, địa chỉ `null` hoặc tỉnh/phường tồn tại, sai → 422; phone lưu dạng chuẩn hóa. `changePassword`: mật khẩu hiện tại sai → `ApiError(422, CURRENT_PASSWORD_WRONG_TEXT)`, mới ngắn → 422. `forgotPassword`: luôn trả thành công; email có tài khoản thì tạo token đặt lại (thay token cũ, hạn `MOCK_RESET_TTL_MS`). `resetPassword`: token sai/hết hạn/đã dùng → `ApiError(400, RESET_LINK_INVALID_TEXT)`; mật khẩu mới ngắn → 422; thành công → đổi mật khẩu, xóa token, **xóa mọi phiên của người đó**. `logout(token)`: xóa phiên, không có token vẫn thành công. `peekResetToken(email): string | null`.
- Produces (adapter, thô, mỗi hàm `await wait()` như hàm cũ): `register(body)`, `login(body)`, `logout()`, `getMe()`, `updateMe(body)`, `changePassword(body)`, `forgotPassword(body)`, `resetPassword(body)`, `peekResetToken(email)`; hàm cần đăng nhập lấy token bằng `getToken()`. `createMockAdapter(latencyMs, now)` tạo `createAuthStore(now)` dùng chung `now`. (`getMyOrders` và các thay đổi đơn hàng ở Task 5.)

- [ ] **Step 1: Write the failing tests** (`t0 = 1_000_000`, `let clock`, `store = createAuthStore(() => clock)`, `localStorage.clear()` mỗi test)

```js
it('register ok: trả token, expires_at = t0 + 86400000, user không có mật khẩu', async () => { const r = store.register({ name: 'An', email: 'An@X.vn ', password: 'matkhau123' }); expect(r.expires_at).toBe(new Date(t0 + 86400000).toISOString()); expect(r.user).toEqual({ id: expect.any(String), name: 'An', email: 'an@x.vn', phone: null, address: null }); expect(JSON.stringify(r)).not.toContain('matkhau123'); });
it('register email trùng (khác hoa thường) → 409 EMAIL_TAKEN_TEXT', ...);
it.each([['tên 1 ký tự'], ['email sai'], ['mật khẩu 7 ký tự']])('register %s → 422', ...);
it('login sai mật khẩu và email không tồn tại → cùng status 401 và cùng message', () => { /* Review Focus 2 */ const a = catchErr(() => store.login({ email: 'an@x.vn', password: 'sai-mat-khau' })); const b = catchErr(() => store.login({ email: 'khong@co.vn', password: 'matkhau123' })); expect([a.status, a.message]).toEqual([401, LOGIN_FAILED_TEXT]); expect([b.status, b.message]).toEqual([a.status, a.message]); });
it('requireUser: token lạ → 401; đúng mốc hết hạn → 401 và phiên bị xóa', () => { /* clock = t0 + 86400000 */ });
it('logout rồi requireUser → 401; logout không token không ném', ...);
it('updateProfile: lưu tên/phone chuẩn hóa/địa chỉ; phone "123" → 422; tỉnh lạ → 422', ...);
it('changePassword: sai hiện tại → 422 CURRENT_PASSWORD_WRONG_TEXT; đúng thì đăng nhập bằng mật khẩu mới được', ...);
it('forgotPassword email lạ không ném và peekResetToken → null; email có tài khoản → token chuỗi', ...);
it('resetPassword dùng token một lần: lần hai → 400 RESET_LINK_INVALID_TEXT', ...);   // Review Focus 3
it('resetPassword hủy mọi phiên cũ: token đăng nhập trước đó → requireUser 401', ...);   // Review Focus 3
it('resetPassword token hết hạn (clock + 900000) → 400; mật khẩu mới 7 ký tự → 422', ...);
it('forgotPassword lần hai thay token cũ: token cũ → 400', ...);
// adapter (createMockAdapter(0, () => clock); saveSession({token}) để đặt "đăng nhập")
it('getMe không có token → 401; có token từ register → trả user thô', ...);
it('updateMe/changePassword/logout đi qua store bằng token của getToken()', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/mocks/authStore.test.js src/api/adapters/mockAuth.test.js` → FAIL.
- [ ] **Step 3: Implement** `createAuthStore` và các hàm adapter; token mock là chuỗi hex ngẫu nhiên 32 ký tự.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: mock xác thực (người dùng, phiên, đặt lại mật khẩu)`

### Task 5: Mock đơn hàng theo tài khoản

**Files:**
- Modify: `src/mocks/orderStore.js` (`buildStoredOrder`, `toRawOrder`), `src/api/adapters/mockAdapter.js`
- Test: `src/api/adapters/mockAccountOrders.test.js`

**Interfaces:**
- Consumes: `createAuthStore` (Task 4), `getToken`, hàm đơn hàng giai đoạn 2.
- Produces: `buildStoredOrder(request, now, userId = null)` lưu thêm `user_id`; `toRawOrder` **loại** `user_id` khỏi kết quả thô. Adapter: `createOrder(request)` — `getToken()` có giá trị thì `requireUser` (không hợp lệ → `ApiError(401)`) và gắn `user_id`; không token → đơn khách. `getOrder(id, phone)` — chủ đơn (token hợp lệ, `user_id` khớp) xem được **không cần `phone`**; còn lại cần `phone` khớp (sai mã hoặc sai SĐT → cùng `ApiError(404, 'Không tìm thấy đơn')`). Thêm `getMyOrders(): Promise<rawOrder[]>` — đơn có `user_id` của người dùng, mới nhất trước (`created_at` giảm dần), tối đa `MY_ORDERS_MAX`, trạng thái tính như giai đoạn 2; thiếu/sai token → 401.

- [ ] **Step 1: Write the failing tests** (hai người dùng A, B đăng ký qua adapter; `setSessionFor(user)` bằng `saveSession`)

```js
it('đặt hàng khi đã đăng nhập: getMyOrders của A có đơn, của B rỗng', ...);
it('đơn khách vãng lai không xuất hiện trong getMyOrders của ai', ...);
it('getMyOrders: mới nhất trước và tối đa 50', async () => { /* 51 đơn với clock tăng dần → length 50, [0] là đơn cuối */ });
it('getOrder của chủ đơn không cần phone', async () => expect((await adapter.getOrder(id, undefined)).id).toBe(id));
it('getOrder của người khác không phone → 404; có phone đúng → ok', ...);
it('getOrder không đăng nhập, không phone → 404 cùng message với sai mã', ...);
it('createOrder với token không hợp lệ/quá hạn → ApiError 401 và không lưu đơn', ...);
it('kết quả thô của đơn không chứa user_id', async () => expect(JSON.stringify(await adapter.getOrder(id, PHONE))).not.toContain('user_id'));
it('getMyOrders không token → 401', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/api/adapters/mockAccountOrders.test.js` → FAIL.
- [ ] **Step 3: Implement**; giữ nguyên toàn bộ test giai đoạn 2 xanh.
- [ ] **Step 4: Run** `npx vitest run` → PASS toàn bộ.
- [ ] **Step 5: Commit** `feat: mock đơn hàng theo tài khoản (gắn đơn, lịch sử, xem không cần SĐT)`

### Task 6: Http adapter và service

**Files:**
- Modify: `src/api/adapters/httpAdapter.js`, `src/services/orderService.js`
- Create: `src/services/authService.js`
- Test: `src/api/adapters/httpAdapter.test.js`, `src/services/authService.test.js`, `src/services/orderService.test.js`

**Interfaces:**
- Consumes: mappers `toAuthResponse`, `toUser`, `toProfileRequest`, `toOrder`, `mapList`; `request`.
- Produces http adapter (thêm): `register(body)`, `login(body)`, `forgotPassword(body)`, `resetPassword(body)` (4 hàm này `auth: false`); `logout()` (`POST /auth/logout`), `getMe()` (`GET /me`), `updateMe(body)` (`PATCH /me`), `changePassword(body)` (`POST /auth/change-password`), `getMyOrders()` (`GET /me/orders`); **không** định nghĩa `peekResetToken`. Đường dẫn theo spec mục 7.
- Produces `authService.js`: `register({name, email, password}): Promise<{token, expiresAt, user}>`, `login({email, password})` (cùng kiểu), `logout(): Promise<void>`, `getMe(): Promise<User>`, `updateProfile(profile): Promise<User>` (qua `toProfileRequest`), `changePassword({currentPassword, newPassword}): Promise<void>` (gửi `current_password`, `new_password`), `forgotPassword(email): Promise<void>`, `resetPassword({token, newPassword}): Promise<void>` (gửi `new_password`), `getMyOrders(): Promise<Order[]>` (bỏ đơn hỏng + warn), `peekResetToken(email): Promise<string | null>` (adapter thiếu hàm → ném `Error` nêu "mock").
- Sửa `orderService.getOrder(id, phone?)`: truyền `phone ? normalizePhone(phone) : undefined` cho adapter.

- [ ] **Step 1: Write the failing tests**

```js
it('http register POST /auth/register không gắn Bearer dù có token', async () => { /* saveSession; fetch mock; headers?.Authorization undefined */ });
it('http login/forgot/reset đều auth:false; getMe/updateMe/changePassword/getMyOrders/logout có Bearer', ...);
it('http updateMe là PATCH /me với body JSON', ...);   it('http getMyOrders GET /me/orders', ...);
it('http adapter không có peekResetToken', ...);
it('authService.register trả AuthResult đã map', ...);   it('login truyền email/password nguyên văn (không log)', ...);
it('updateProfile gửi toProfileRequest', ...);   it('changePassword gửi current_password/new_password', ...);
it('getMyOrders bỏ đơn hỏng và warn', ...);
it('peekResetToken thiếu ở adapter ném lỗi nêu "mock"', ...);
it('orderService.getOrder không phone → adapter nhận undefined; có "+84 901 234 567" → "0901234567"', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/api src/services` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS (suite cũ vẫn xanh).
- [ ] **Step 5: Commit** `feat: http adapter và service xác thực`

### Task 7: AuthContext, AuthProvider và nối vào app

**Files:**
- Create: `src/features/auth/AuthContext.jsx`
- Modify: `src/main.jsx` (`QueryClientProvider > AuthProvider > CartProvider > BrowserRouter`), `src/test/renderWithProviders.jsx` (thêm `AuthProvider` giữa `QueryClientProvider` và `CartProvider`)
- Test: `src/features/auth/AuthContext.test.jsx`

**Interfaces:**
- Consumes: `session.js`, `authService` (`getMe`, `login`, `register`, `logout`), `setUnauthorizedHandler`, `useQueryClient`.
- Produces: `<AuthProvider>`; `useAuth(): { status: 'loading' | 'anonymous' | 'authenticated', user: User | null, sessionExpired: boolean, login({email, password}): Promise<void>, register({name, email, password}): Promise<void>, logout(): Promise<void>, setUser(user): void, dismissExpired(): void }`; `useAuth` ngoài provider ném lỗi nêu "AuthProvider".
- Hành vi (spec mục 4): mount → không phiên: `anonymous`; có phiên đã hết hạn: `clearSession` + `anonymous`, không gọi API; còn hạn: `loading` rồi `getMe` — thành công `authenticated`; 401 → `clearSession` + `anonymous`; lỗi khác (kể cả mạng) → `anonymous`, **giữ token**. `login`/`register` thành công: `saveSession`, `setUser`, `queryClient.removeQueries()`, `sessionExpired=false`. `logout`: `clearSession` + `removeQueries` + `anonymous` **trước**, rồi gọi `authService.logout()` (lỗi nuốt có `console.warn` không kèm token). Handler 401: `clearSession`, `removeQueries`, `anonymous`, `sessionExpired=true`. Đăng ký/gỡ handler khi mount/unmount.

- [ ] **Step 1: Write the failing tests** (mock adapter `createMockAdapter(0)` qua `vi.mock('../../api')`; component `Probe` hiển thị `status`, tên, `sessionExpired`)

```js
it('không phiên → anonymous và không gọi getMe', ...);
it('phiên hết hạn → anonymous, phiên bị xóa, không gọi getMe', ...);
it('phiên còn hạn → loading rồi authenticated với đúng tên', ...);
it('getMe trả 401 → anonymous và phiên bị xóa', ...);
it('getMe lỗi mạng (status 0) → anonymous nhưng token còn trong localStorage', ...);
it('login: authenticated, phiên đã lưu, query cũ bị xóa', async () => { /* seed queryClient.setQueryData(['my-orders','x'], [1]); sau login getQueryData === undefined */ });
it('login sai → ném ApiError 401, vẫn anonymous', ...);
it('logout: phiên và cache xóa kể cả khi adapter.logout bị từ chối', ...);   // Review Focus 5
it('401 từ request có token → anonymous và sessionExpired=true; login lại đặt cờ về false', ...);
it('dismissExpired đặt cờ về false', ...);   it('useAuth ngoài provider ném lỗi', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/features/auth/AuthContext.test.jsx` → FAIL.
- [ ] **Step 3: Implement**; sửa `renderWithProviders` và `main.jsx`; toàn bộ suite cũ vẫn xanh.
- [ ] **Step 4: Run** `npx vitest run` → PASS toàn bộ.
- [ ] **Step 5: Commit** `feat: AuthProvider và phiên đăng nhập`

### Task 8: Đăng nhập và đăng ký

**Files:**
- Create: `src/components/PasswordField.jsx`, `src/pages/LoginPage.jsx`, `src/pages/RegisterPage.jsx` (+ CSS Modules)
- Modify: `src/App.jsx` (route `login`, `register`)
- Test: `src/components/PasswordField.test.jsx`, `src/pages/LoginPage.test.jsx`, `src/pages/RegisterPage.test.jsx`

**Interfaces:**
- Consumes: `useAuth`, `safeReturnTo`, `validateLogin`, `validateRegister`, `FormField`/`fieldProps`, `LOGIN_FAILED_TEXT`, `EMAIL_TAKEN_TEXT`, `SESSION_EXPIRED_TEXT`.
- Produces: `<PasswordField name label value onChange error autoComplete />` — `FormField` + `<input type="password">` và nút `aria-label` "Hiện mật khẩu"/"Ẩn mật khẩu" (đổi `type`); `<LoginPage />`: nhãn "Email", "Mật khẩu", nút "Đăng nhập", link "Đăng ký tài khoản" (giữ `returnTo`) và "Quên mật khẩu?"; thành công → `navigate(safeReturnTo(returnTo))`; 401 → `role="alert"` `LOGIN_FAILED_TEXT`; `sessionExpired` → `role="status"` `SESSION_EXPIRED_TEXT`; đã `authenticated` thì `<Navigate>` tới `safeReturnTo`. `<RegisterPage />`: nhãn "Họ tên", "Email", "Mật khẩu", "Nhập lại mật khẩu", nút "Tạo tài khoản"; thành công → đăng nhập luôn và chuyển như trên; 409 → `EMAIL_TAKEN_TEXT` dưới ô email. Nút bị vô hiệu khi đang gửi; lỗi kiểm tra form hiện dưới ô và focus ô sai đầu tiên.

- [ ] **Step 1: Write the failing tests** (mock adapter `createMockAdapter(0)`; `LocationDisplay`; người dùng seed qua `adapter.register`)

```js
it('PasswordField: bấm "Hiện mật khẩu" đổi type sang text và nhãn nút thành "Ẩn mật khẩu"', ...);
it('Login thành công chuyển tới returnTo hợp lệ (/orders/CF1)', ...);
it('Login với returnTo độc hại (//evil.com) chuyển về "/"', ...);   // Review Focus 4
it('Login sai mật khẩu và email lạ cùng hiện LOGIN_FAILED_TEXT', ...);   // Review Focus 2
it('Login form rỗng: lỗi dưới ô, focus ô Email, không gọi adapter.login', ...);
it('Login hiện thông báo hết phiên khi sessionExpired', ...);
it('Login khi đã đăng nhập → chuyển ngay', ...);
it('Login: link Đăng ký giữ returnTo trong URL', ...);
it('Register thành công: đã đăng nhập (Header/AuthContext authenticated) và chuyển tới returnTo hoặc "/"', ...);
it('Register email trùng: lỗi EMAIL_TAKEN_TEXT dưới ô email, không đăng nhập', ...);
it('Register: mật khẩu nhập lại lệch → lỗi, không gọi adapter.register', ...);
it('Register: nút bị vô hiệu khi đang gửi (bấm hai lần chỉ gọi adapter.register một lần)', ...);
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run` → PASS.
- [ ] **Step 5: Commit** `feat: trang đăng nhập và đăng ký`

### Task 9: Quên và đặt lại mật khẩu

**Files:**
- Create: `src/hooks/useForgotPassword.js`, `src/hooks/useResetPassword.js`, `src/pages/ForgotPasswordPage.jsx`, `src/pages/ResetPasswordPage.jsx` (+ CSS Modules)
- Modify: `src/App.jsx` (route `forgot-password`, `reset-password`)
- Test: `src/pages/ForgotPasswordPage.test.jsx`, `src/pages/ResetPasswordPage.test.jsx`

**Interfaces:**
- Consumes: `authService.forgotPassword/resetPassword/peekResetToken`, `validateLogin` (chỉ kiểm email) và `validateReset`, `env`, `FORGOT_SENT_TEXT`, `RESET_LINK_INVALID_TEXT`.
- Produces: `useForgotPassword()` (mutation `(email) => forgotPassword(email)`); `useResetPassword()` (mutation `({token, newPassword}) => resetPassword(...)`). `<ForgotPasswordPage />`: h1 "Quên mật khẩu", nhãn "Email", nút "Gửi hướng dẫn"; thành công hiện `FORGOT_SENT_TEXT` (`role="status"`) cho **mọi** email hợp lệ; ở `env.apiMode === 'mock'` thì sau đó gọi `peekResetToken(email)` và nếu có token hiện `<aside aria-label="Hộp thư giả lập">` với link "Đặt lại mật khẩu" → `/reset-password?token=<token>`. `<ResetPasswordPage />`: h1 "Đặt lại mật khẩu"; đọc `token` từ query; thiếu token hoặc backend 400 → `RESET_LINK_INVALID_TEXT` kèm link "Yêu cầu liên kết mới" → `/forgot-password`; nhãn "Mật khẩu mới", "Nhập lại mật khẩu mới", nút "Đặt lại mật khẩu"; thành công hiện "Đã đặt lại mật khẩu" và link "Đăng nhập" → `/login`.

- [ ] **Step 1: Write the failing tests**

```js
it('Forgot: email hợp lệ có tài khoản → FORGOT_SENT_TEXT và hộp thư giả lập có link /reset-password?token=...', ...);
it('Forgot: email không có tài khoản → vẫn FORGOT_SENT_TEXT, không có hộp thư giả lập', ...);
it('Forgot: email sai định dạng → lỗi dưới ô, không gọi adapter.forgotPassword', ...);
it('Reset: không có token trong URL → RESET_LINK_INVALID_TEXT và link /forgot-password', ...);
it('Reset: token đúng + mật khẩu hợp lệ → "Đã đặt lại mật khẩu" và đăng nhập được bằng mật khẩu mới', ...);
it('Reset: token dùng lần hai → RESET_LINK_INVALID_TEXT', ...);
it('Reset: mật khẩu 7 ký tự / nhập lại lệch → lỗi dưới ô, không gọi adapter.resetPassword', ...);
it('Reset không ghi token vào console (spy console.*, không chứa token)', ...);
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run` → PASS.
- [ ] **Step 5: Commit** `feat: quên và đặt lại mật khẩu`

### Task 10: ProtectedRoute, Header và lịch sử đơn

**Files:**
- Create: `src/components/ProtectedRoute.jsx`, `src/hooks/useMyOrders.js`, `src/pages/AccountOrdersPage.jsx` (+ CSS Modules)
- Modify: `src/components/Header.jsx`, `src/App.jsx` (nhóm route bọc `ProtectedRoute`: `account/orders` ở task này; `account` ở Task 11)
- Test: `src/components/ProtectedRoute.test.jsx`, `src/pages/AccountOrdersPage.test.jsx`, `src/components/Header.test.jsx`

**Interfaces:**
- Consumes: `useAuth`, `authService.getMyOrders`, `STATUS_LABELS`, `formatVnd`, `ErrorState`, `EmptyState`, `Skeleton`.
- Produces: `<ProtectedRoute />` (route layout dùng `<Outlet />`): `loading` → `Skeleton`; `anonymous` → `<Navigate replace to={'/login?returnTo=' + encodeURIComponent(pathname + search)} />`; `authenticated` → `<Outlet />`. `useMyOrders()`: `useQuery` khóa `['my-orders', user?.id]`, `enabled` khi `authenticated`. `<AccountOrdersPage />`: h1 "Lịch sử đơn"; mỗi đơn một hàng: link `Đơn <id>` → `/orders/<id>`, ngày giờ (`toLocaleString('vi-VN')`), nhãn `STATUS_LABELS[status]`, tổng tiền; rỗng → `EmptyState` "Bạn chưa có đơn nào"; lỗi → `ErrorState` + Thử lại. Header: `anonymous` → link "Đăng nhập" → `/login`; `authenticated` → link `Tài khoản: <tên>` → `/account`; `loading` → không hiện gì thêm.

- [ ] **Step 1: Write the failing tests**

```js
it('ProtectedRoute loading → hiện khung chờ, không chuyển hướng', ...);
it('ProtectedRoute anonymous → /login?returnTo=%2Faccount%2Forders%3Fx%3D1', ...);
it('ProtectedRoute authenticated → hiển thị trang con', ...);
it('lịch sử đơn: hiện đơn của mình mới nhất trước, link /orders/<id>, trạng thái và tổng tiền', ...);
it('lịch sử đơn rỗng → "Bạn chưa có đơn nào"', ...);
it('lịch sử đơn lỗi tải → ErrorState; Thử lại tải lại được', ...);
it('đăng xuất rồi đăng nhập người khác: không thấy đơn của người trước (khóa theo user id, cache bị xóa)', ...);   // Review Focus 5
it('Header anonymous có link Đăng nhập → /login; authenticated có "Tài khoản: An" → /account', ...);
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run` → PASS.
- [ ] **Step 5: Commit** `feat: route cần đăng nhập, Header tài khoản và lịch sử đơn`

### Task 11: Trang tài khoản (hồ sơ, đổi mật khẩu, đăng xuất)

**Files:**
- Create: `src/hooks/useUpdateProfile.js`, `src/hooks/useChangePassword.js`, `src/components/ProfileForm.jsx`, `src/components/ChangePasswordForm.jsx`, `src/pages/AccountPage.jsx` (+ CSS Modules)
- Modify: `src/App.jsx` (route `account` trong nhóm `ProtectedRoute`)
- Test: `src/components/ProfileForm.test.jsx`, `src/components/ChangePasswordForm.test.jsx`, `src/pages/AccountPage.test.jsx`

**Interfaces:**
- Consumes: `useAuth` (`user`, `setUser`, `logout`), `authService.updateProfile/changePassword`, `validateProfile`, `validateChangePassword`, `AddressFields`, `PasswordField`, `CURRENT_PASSWORD_WRONG_TEXT`.
- Produces: `useUpdateProfile()` (mutation → `updateProfile(profile)`, thành công gọi `setUser(user)`); `useChangePassword()` (mutation → `changePassword({currentPassword, newPassword})`). `<ProfileForm />`: nhãn "Họ tên", "Email" (`readOnly`), "Số điện thoại", các ô của `AddressFields`; khởi tạo từ `user`; nút "Lưu thay đổi"; thành công `role="status"` "Đã lưu"; lỗi `role="alert"`. `<ChangePasswordForm />`: nhãn "Mật khẩu hiện tại", "Mật khẩu mới", "Nhập lại mật khẩu mới"; nút "Đổi mật khẩu"; thành công `role="status"` "Đã đổi mật khẩu" và xóa trắng ba ô; 422 → lỗi dưới ô "Mật khẩu hiện tại". `<AccountPage />`: h1 "Tài khoản", h2 "Hồ sơ" và "Đổi mật khẩu", link "Lịch sử đơn" → `/account/orders`, nút "Đăng xuất" (gọi `logout()` rồi `navigate('/')`).

- [ ] **Step 1: Write the failing tests**

```js
it('ProfileForm điền sẵn tên, email (chỉ đọc), SĐT và địa chỉ từ hồ sơ', ...);
it('lưu hồ sơ hợp lệ: "Đã lưu", AuthContext có tên mới, gọi adapter.updateMe với toProfileRequest', ...);
it('SĐT "123" → lỗi dưới ô, không gọi adapter.updateMe', ...);
it('chỉ chọn tỉnh mà thiếu phường/đường → lỗi hai ô còn lại', ...);
it('xóa trống cả ba ô địa chỉ và lưu → address null', ...);
it('đổi mật khẩu đúng: "Đã đổi mật khẩu", ba ô trống, đăng nhập bằng mật khẩu mới được', ...);
it('mật khẩu hiện tại sai → CURRENT_PASSWORD_WRONG_TEXT dưới ô hiện tại, ô mật khẩu mới giữ nguyên', ...);
it('mật khẩu mới trùng hiện tại / ngắn / nhập lại lệch → lỗi, không gọi adapter.changePassword', ...);
it('Đăng xuất: về "/", phiên bị xóa, Header lại hiện "Đăng nhập"', ...);   // Review Focus 5
it('link Lịch sử đơn → /account/orders', ...);
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run` → PASS.
- [ ] **Step 5: Commit** `feat: trang tài khoản (hồ sơ, đổi mật khẩu, đăng xuất)`

### Task 12: Thanh toán và xem đơn khi đã đăng nhập

**Files:**
- Modify: `src/pages/CheckoutPage.jsx`, `src/hooks/useOrder.js`, `src/hooks/useOrderAccess.js`, `src/pages/PaymentPage.jsx`, `src/pages/OrderTrackingPage.jsx`
- Test: `src/pages/CheckoutPage.test.jsx`, `src/hooks/useOrder.test.jsx`, `src/pages/OrderTrackingPage.test.jsx`, `src/pages/PaymentPage.test.jsx`

**Interfaces:**
- Consumes: `useAuth`, `CHECKOUT_SESSION_EXPIRED_TEXT`, `session.js` (chỉ trong test).
- Produces: `useOrder(id, phone, userId?)` — `enabled: Boolean(id && (phone || userId))`, khóa `['order', id, phone, userId ?? 'guest']` (test cũ gọi hai tham số vẫn đúng). `useOrderAccess(id)` trả thêm `needsPhone: boolean`: có `phone` → `false`; không `phone`: `status === 'loading'` → `false` (chờ xác thực), `anonymous` → `true`, `authenticated` → `true` chỉ khi truy vấn không phone đã lỗi 404. Trang theo dõi và thanh toán hiện `PhoneGate` khi `needsPhone`, thay cho điều kiện `!phone` cũ; đang chờ thì hiện `Skeleton`. `CheckoutPage`: khi `authenticated` và khách chưa sửa ô nào thì điền sẵn `name`, `phone`, `provinceId`, `wardId`, `street` từ hồ sơ **một lần** (không bao giờ ghi đè dữ liệu đã gõ); khi `createOrder.error.status === 401` hiện `CHECKOUT_SESSION_EXPIRED_TEXT` thay thông điệp lỗi, giữ giỏ, form và `clientRequestId`.

- [ ] **Step 1: Write the failing tests**

```js
it('Checkout đăng nhập: điền sẵn tên, SĐT, tỉnh, phường, đường từ hồ sơ', ...);
it('Checkout: không ghi đè ô khách đã gõ trước khi hồ sơ tải xong', ...);
it('Checkout đã đăng nhập đặt thành công: đơn nằm trong getMyOrders của người đó', ...);
it('Checkout hết phiên giữa lúc đặt: hiện CHECKOUT_SESSION_EXPIRED_TEXT, giỏ và form còn nguyên, Header lại hiện "Đăng nhập"', ...);   // Review Focus 1
it('Checkout hết phiên rồi bấm Đặt hàng lại: tạo đơn khách (không có trong getMyOrders), cùng client_request_id', ...);   // Review Focus 1
it('useOrder: có userId không phone vẫn gọi; khóa gồm userId', ...);
it('Tracking của chính mình mở không cần SĐT (không PhoneGate)', ...);
it('Tracking đơn của người khác khi đã đăng nhập → PhoneGate; nhập SĐT đúng thì xem được', ...);
it('Tracking lúc AuthContext còn loading → Skeleton, không nháy PhoneGate', ...);
it('Tracking khách vãng lai không có SĐT → PhoneGate như giai đoạn 2', ...);
it('Payment của chính mình (đơn online) mở không cần SĐT', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/pages src/hooks` → FAIL.
- [ ] **Step 3: Implement**; test giai đoạn 2 cho trang đơn/thanh toán vẫn xanh.
- [ ] **Step 4: Run** `npx vitest run` → PASS toàn bộ.
- [ ] **Step 5: Commit** `feat: điền sẵn thanh toán, xem đơn của chính mình, xử lý hết phiên`

### Task 13: Tài liệu và kiểm tra cuối

**Files:**
- Modify: `README.md`
- Test: toàn bộ

**Interfaces:** không có.

- [ ] **Step 1: Cập nhật `README.md`:** thêm các trang mới vào bảng route; mục "Tài khoản và phiên đăng nhập" (token trong `localStorage`, rủi ro XSS và khuyến nghị CSP, đổi sang cookie chỉ sửa `session.js` + `client.js`); hợp đồng API giả định của giai đoạn 3 (chép từ spec mục 7); lưu ý hộp thư giả lập và `peekResetToken` chỉ có ở mock, mật khẩu mock không an toàn; cập nhật mục "Chưa có" (còn cửa hàng, ưu đãi, cổng thanh toán thật, xác minh email).
- [ ] **Step 2: Run** `npm test` → mọi test PASS; `npm run build` → thành công, không cảnh báo mới; `VITE_API_MODE=http VITE_API_BASE_URL=https://api.example.com/v1 npm run build` → thành công.
- [ ] **Step 3: Quét an toàn:** `grep -rnE "console\.(log|warn|error)" src --include=*.js --include=*.jsx | grep -v "\.test\."` rồi đọc từng dòng: không dòng nào in token, mật khẩu hay email-kèm-mật-khẩu; `grep -rn "localStorage" src | grep -v "\.test\." ` chỉ nằm ở các module lưu trữ (`session.js`, `storage.js`, `recentOrders.js`, `orderStore.js`, `authStore.js`).
- [ ] **Step 4: Kiểm tra thủ công** bằng `npm run dev` ở 1280px và 1024px: đăng ký → thêm món → `/checkout` (kiểm tra điền sẵn) → đặt hàng → `/account/orders` thấy đơn → `/account` sửa hồ sơ, đổi mật khẩu → đăng xuất → quên mật khẩu qua hộp thư giả lập → đăng nhập bằng mật khẩu mới; mở `/account` khi chưa đăng nhập (kiểm `returnTo`). Ghi kết quả từng bước; chỗ nào chưa chạy thật (không có trình duyệt) thì nói rõ là chưa chạy.
- [ ] **Step 5: Commit** `docs: README và kiểm tra giai đoạn 3`
