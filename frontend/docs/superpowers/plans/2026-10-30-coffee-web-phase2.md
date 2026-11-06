# Coffee Web Giai đoạn 2 (Đặt hàng) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm luồng Giỏ → Thanh toán (form địa chỉ hai cấp) → trả tiền online giả lập → theo dõi đơn, chạy bằng mock và đổi sang API thật chỉ bằng adapter/mapper.

**Architecture:** Giữ luồng giai đoạn 1: `component → hook (TanStack Query) → service → adapter (mock | http) → mapper → model`. Mock lưu đơn trong `localStorage`; trạng thái đơn là hàm thuần của thời gian; trang theo dõi polling. Request đặt hàng không chứa giá.

**Tech Stack:** như giai đoạn 1 (React, Vite, React Router, TanStack Query, CSS Modules, Vitest + Testing Library). Không thêm dependency.

**Spec:** `docs/superpowers/specs/2026-10-30-coffee-web-phase2-design.md` (nền: `...phase1-design.md`). Nhánh: `feat/phase2`. Làm việc trong `/home/claude/coffee-web` (thư mục outputs không hỗ trợ symlink nên `npm install` hỏng ở đó); xong thì đồng bộ về outputs, bỏ `node_modules`.

## Global Constraints

- Giao diện tiếng Việt, cam `#fb8d17`, desktop từ 1024px; màu/khoảng cách dùng tokens trong `src/styles/tokens.css`.
- Không thêm dependency. Giá trị mới đặt trong `src/constants.js`: `PAYMENT_TTL_MS=300000`, `STEP_PLACED_MS=15000`, `STEP_PREPARING_MS=30000`, `STEP_DELIVERING_MS=45000`, `MOCK_DELIVERY_FEE=15000`, `POLL_INTERVAL_MS=5000`, `RECENT_ORDERS_MAX=10`, `RECENT_ORDERS_VERSION=1`, `RECENT_ORDERS_KEY='coffee-web:recent-orders'`, `MOCK_ORDERS_KEY='coffee-web:mock-orders'`, `NAME_MIN=2`, `NAME_MAX=60`, `STREET_MIN=5`, `STREET_MAX=120`.
- Địa chỉ hai cấp Tỉnh/Thành → Phường/Xã, **không có Quận/Huyện**; dữ liệu mẫu 3 tỉnh/thành (Hà Nội, TP. Hồ Chí Minh, Đà Nẵng) × 4 phường tên mẫu "Phường Mẫu 1..4", không bịa tên thật.
- Request đặt hàng không gửi giá. Giỏ chỉ bị xóa sau khi đặt thành công; thất bại giữ giỏ và form.
- Số điện thoại: không nằm trong URL của app, không ghi ra log. API tra đơn cần cả mã đơn và SĐT; sai một trong hai trả 404 giống nhau.
- Nút/hành vi chỉ cho mock (giả lập thanh toán) chỉ hiện khi `env.apiMode === 'mock'`.
- Code theo `coding-hieu-qua` (không magic number, early return, không nuốt lỗi); task giao diện đọc `frontend-design` (focus nhìn thấy được, `prefers-reduced-motion`).
- Ngoài phạm vi: cổng thanh toán thật, voucher, đăng nhập, khách tự hủy/sửa đơn, realtime.

## Review Focus

1. Bấm "Đặt hàng" hai lần liên tiếp chỉ tạo **một** đơn (Task 8; mock chống trùng ở Task 4).
2. Môi trường không có `crypto.randomUUID` (trang http không bảo mật) vẫn tạo được `clientRequestId` hợp lệ (Task 1).
3. SĐT gõ kiểu `+84 901 234 567` hoặc `0901.234.567` được chấp nhận và vẫn tra ra đúng đơn đã lưu `0901234567` (Tasks 1, 4).
4. Tra đơn sai SĐT và tra đơn sai mã cho cùng một thông báo và mã 404, không lộ mã nào tồn tại (Tasks 4, 10).
5. Mở trang thanh toán khi đã quá hạn: đồng hồ dừng ở `00:00` (không âm), hiện "Đơn đã hết hạn thanh toán" (Task 9).

---

### Task 1: Nền tảng thuần (hằng số, SĐT, id, trạng thái, kiểm tra form)

**Files:**
- Modify: `src/constants.js`
- Create: `src/lib/phone.js`, `src/lib/id.js`, `src/features/orders/orderStatus.js`, `src/features/checkout/validate.js`
- Test: `src/lib/phone.test.js`, `src/lib/id.test.js`, `src/features/orders/orderStatus.test.js`, `src/features/checkout/validate.test.js`

**Interfaces:**
- Produces: `normalizePhone(input: string): string` (bỏ khoảng trắng, `.`, `-`; `+84` đầu → `0`); `isValidPhone(input: string): boolean` (sau chuẩn hóa khớp `/^0(3|5|7|8|9)\d{8}$/`); `newRequestId(): string` (UUID v4; dùng `crypto.randomUUID` nếu có, không thì dựng từ `crypto.getRandomValues`).
- Produces `orderStatus.js`: `STATUS_LABELS` (`awaiting_payment` 'Chờ thanh toán', `placed` 'Chờ xác nhận', `preparing` 'Đang pha chế', `delivering` 'Đang giao', `delivered` 'Đã giao', `cancelled` 'Đã hủy'); `PAYMENT_STATUS_LABELS` (`unpaid` 'Thanh toán khi nhận hàng', `pending` 'Chờ thanh toán', `paid` 'Đã thanh toán', `expired` 'Hết hạn thanh toán'); `PAYMENT_METHODS = [{id:'cash',label:'Tiền mặt, thanh toán khi nhận hàng',online:false},{id:'bank_transfer',label:'Chuyển khoản QR',online:true},{id:'wallet',label:'Ví điện tử',online:true}]`; `PROGRESS_STEPS = ['placed','preparing','delivering','delivered']`; `isFinalStatus(status): boolean`; `isOnlinePayment(methodId): boolean`.
- Produces `validate.js`: `FIELD_ORDER = ['name','phone','provinceId','wardId','street','note','paymentMethod']`; `validateCheckout(form: {name,phone,provinceId,wardId,street,note,paymentMethod}): {valid: boolean, errors: Partial<Record<field,string>>}`. Thông điệp: name 'Nhập họ tên từ 2 đến 60 ký tự'; phone 'Số điện thoại không hợp lệ (di động 10 số, ví dụ 0901234567)'; provinceId 'Chọn tỉnh/thành'; wardId 'Chọn phường/xã'; street 'Nhập số nhà và tên đường (5–120 ký tự)'; note 'Ghi chú tối đa 200 ký tự'; paymentMethod 'Chọn phương thức thanh toán'. `name`/`street` cắt khoảng trắng trước khi đo; `note` tùy chọn.

- [ ] **Step 1: Write the failing tests**

```js
// phone
it.each(['+84 901 234 567','0901.234.567','090-123-4567'])('chuẩn hóa %s', v => expect(normalizePhone(v)).toBe(v.includes('+84') ? '0901234567' : v.replace(/\D/g,'')));
it.each(['0901234567','+84901234567','0351234567'])('%s hợp lệ', v => expect(isValidPhone(v)).toBe(true));
it.each(['0201234567','090123456','09012345678','abc',''])('%s không hợp lệ', v => expect(isValidPhone(v)).toBe(false));
// id (Review Focus 2)
const UUID4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
it('dùng randomUUID khi có', () => { vi.stubGlobal('crypto', { randomUUID: () => 'x-uuid' }); expect(newRequestId()).toBe('x-uuid'); });
it('không có randomUUID vẫn ra UUID v4 hợp lệ và khác nhau', () => { vi.stubGlobal('crypto', { getRandomValues: (a) => webcrypto.getRandomValues(a) });  // import { webcrypto } from 'node:crypto' const a = newRequestId(); expect(a).toMatch(UUID4); expect(newRequestId()).not.toBe(a); });
// orderStatus
it('trạng thái cuối', () => { expect(isFinalStatus('delivered')).toBe(true); expect(isFinalStatus('cancelled')).toBe(true); expect(isFinalStatus('placed')).toBe(false); });
it('isOnlinePayment', () => { expect(isOnlinePayment('cash')).toBe(false); expect(isOnlinePayment('wallet')).toBe(true); });
it('PROGRESS_STEPS đúng thứ tự', () => expect(PROGRESS_STEPS).toEqual(['placed','preparing','delivering','delivered']));
// validate (form hợp lệ: 'Nguyễn An','0901234567','hn','hn-1','12 Lê Lợi','','cash')
it('form hợp lệ → {valid:true, errors:{}}', ...);
it('form rỗng → lỗi ở mọi trường trừ note, đúng thông điệp', ...);
it('tên chỉ khoảng trắng hoặc 1 ký tự sau trim → lỗi name', ...);   it('tên 61 ký tự → lỗi', ...);
it('đường 4 ký tự → lỗi; 5 ký tự → ok', ...);   it('note 201 ký tự → lỗi', ...);
it('paymentMethod "crypto" → lỗi', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/lib src/features` → FAIL.
- [ ] **Step 3: Implement** theo Interfaces; thêm hằng số vào `constants.js`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: nền tảng đặt hàng (SĐT, id, trạng thái, kiểm tra form)`

### Task 2: Địa chỉ (mock, mapper, service, hook)

**Files:**
- Create: `src/mocks/addresses.js`, `src/mappers/address.js`, `src/services/addressService.js`, `src/hooks/useProvinces.js`, `src/hooks/useWards.js`
- Modify: `src/api/adapters/mockAdapter.js`, `src/api/adapters/httpAdapter.js`
- Test: `src/mappers/address.test.js`, `src/api/adapters/mockAdapter.test.js`, `src/services/addressService.test.js`, `src/hooks/useWards.test.jsx`

**Interfaces:**
- Consumes: `mapList`, `requireField` (`src/mappers/shared.js`), `ApiError`, `request`.
- Produces adapter (thô): `getProvinces(): Promise<{id,name}[]>`; `getWards(provinceId: string): Promise<{id,name}[]>` (tỉnh lạ → `ApiError(404)`). Http: `GET /provinces`, `GET /provinces/:id/wards` (`encodeURIComponent`).
- Produces: `toProvince/toProvinces`, `toWard/toWards` (`{id: string, name: string}`; `toXs` bỏ phần tử hỏng + `console.warn`, như `mapList`); services `getProvinces(): Promise<Province[]>`, `getWards(provinceId): Promise<Ward[]>`; hooks `useProvinces()`, `useWards(provinceId: string)` (`enabled: Boolean(provinceId)`; query key `['wards', provinceId]`).
- Dữ liệu mẫu: ids `hn`,`hcm`,`dn`; phường `hn-1..hn-4` v.v., tên "Phường Mẫu 1..4".

- [ ] **Step 1: Write the failing tests**

```js
it('mock có 3 tỉnh', async () => expect(await adapter.getProvinces()).toHaveLength(3));
it('mock hn có 4 phường tên "Phường Mẫu 1..4"', async () => { const w = await adapter.getWards('hn'); expect(w).toHaveLength(4); expect(w[0].name).toBe('Phường Mẫu 1'); });
it('tỉnh lạ → ApiError 404', async () => await expect(adapter.getWards('zzz')).rejects.toMatchObject({ status: 404 }));
it('toProvinces bỏ phần tử thiếu name và warn', ...);   it('toWards nhận id số → chuỗi', ...);
it('addressService map dữ liệu thô', ...);
it('useWards("") không gọi service', async () => { /* getWards chưa được gọi */ });
it('useWards("hn") trả 4 phường', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/mappers src/api src/services src/hooks` → FAIL.
- [ ] **Step 3: Implement** (adapter nhận dữ liệu từ `src/mocks/addresses.js`; hook theo mẫu `useProducts`).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: địa chỉ hai cấp (mock, mapper, service, hook)`

### Task 3: Mapper đơn hàng

**Files:**
- Create: `src/mappers/order.js`
- Test: `src/mappers/order.test.js`

**Interfaces:**
- Consumes: `requireField`, `requireMoney` (`src/mappers/shared.js`), `normalizePhone`, `STATUS_LABELS`, `PAYMENT_STATUS_LABELS`, `PAYMENT_METHODS`.
- Produces: `toOrder(raw: object): Order` theo spec mục 6 và dạng thô ở spec mục 7; ném `Error` nêu tên trường nếu thiếu `id`/`status`/`created_at`, `status`/`payment_method`/`payment_status` ngoài danh sách đã biết, số tiền không phải số ≥ 0, hoặc một món trong `items` hỏng (cả đơn lỗi). Mặc định: `summary=''`, `note=''`, `payment=null`.
- Produces: `toOrderRequest({ form, items, clientRequestId }: { form: {name,phone,provinceId,wardId,street,note,paymentMethod}, items: CartItem[], clientRequestId: string }): object` theo spec mục 7 (tên/đường/ghi chú cắt khoảng trắng; SĐT chuẩn hóa; **không có trường giá**).

- [ ] **Step 1: Write the failing tests**

```js
it('toOrder map snake_case → camelCase', () => expect(toOrder(raw)).toMatchObject({ id: 'CF00000001', status: 'placed', paymentMethod: 'cash', paymentStatus: 'unpaid', deliveryFee: 15000, total: 129000, address: { provinceName: 'Hà Nội', wardName: 'Phường Mẫu 1', street: '12 Lê Lợi' }, items: [{ productId: 'tra-dao', unitPrice: 57000, quantity: 2 }], payment: null }));
it('payment → { expiresAt, qrContent }', ...);
it.each([['id'],['status'],['created_at']])('thiếu %s ném lỗi nêu tên trường', f => expect(() => toOrder({ ...raw, [f]: undefined })).toThrow(new RegExp(f)));
it('status lạ ném lỗi nêu giá trị', () => expect(() => toOrder({ ...raw, status: 'teleported' })).toThrow(/teleported/));
it('total âm ném lỗi', ...);   it('một món thiếu name làm cả đơn lỗi', ...);
it('toOrderRequest: không chứa trường giá', () => expect(JSON.stringify(toOrderRequest(args))).not.toMatch(/price/i));
it('toOrderRequest: chuẩn hóa SĐT, cắt khoảng trắng, giữ client_request_id', () => expect(req).toMatchObject({ client_request_id: 'rid-1', customer: { name: 'Nguyễn An', phone: '0901234567' }, address: { province_id: 'hn', ward_id: 'hn-1', street: '12 Lê Lợi' }, note: 'gọi trước', payment_method: 'cash' }));
it('toOrderRequest: items đúng {product_id,size_id,topping_ids,note,quantity}', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/mappers/order.test.js` → FAIL.
- [ ] **Step 3: Implement** hai hàm trong `src/mappers/order.js`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: mapper đơn hàng (toOrder, toOrderRequest)`

### Task 4: Mock đơn hàng (store, trạng thái theo thời gian, adapter)

**Files:**
- Create: `src/mocks/orderStore.js`
- Modify: `src/api/adapters/mockAdapter.js`
- Test: `src/mocks/orderStore.test.js`, `src/api/adapters/mockOrders.test.js`

**Interfaces:**
- Consumes: `mocks/products.js` (dữ liệu thô), `normalizePhone`, `isOnlinePayment`, hằng số thời gian/phí, `MOCK_ORDERS_KEY`, `ApiError`.
- Produces `orderStore.js`: `computeOrderStatus(order: StoredOrder, now: number): { status, paymentStatus }` với `StoredOrder` = dạng đơn thô (spec mục 7) cộng `paid_at: string|null` và `client_request_id: string`; `loadStoredOrders(): StoredOrder[]`, `saveStoredOrders(list): void` (bọc `try/catch`, hỏng → `[]`); `newOrderId(): string` khớp `/^CF\d{8}$/`.
- Quy tắc `computeOrderStatus` (spec mục 8): mốc `start` = `created_at` (tiền mặt) hoặc `paid_at` (online); online chưa có `paid_at` → `awaiting_payment/pending` nếu `now < created_at + PAYMENT_TTL_MS`, ngược lại `cancelled/expired`; còn lại `elapsed < 15000` → `placed`, `< 45000` → `preparing`, `< 90000` → `delivering`, ngược lại `delivered`. `paymentStatus`: tiền mặt `unpaid`; online đã `paid_at` → `paid`.
- Produces: `createMockAdapter(latencyMs = MOCK_LATENCY_MS, now = Date.now)` thêm: `createOrder(request): Promise<rawOrder>`, `getOrder(id: string, phone: string): Promise<rawOrder>`, `simulatePayment(id: string): Promise<rawOrder>`. `createOrder`: cùng `client_request_id` trả lại đơn cũ; tính `unitPrice`/`subtotal` từ danh mục (`base_price` + `extra_price` size + giá topping không trùng) × số lượng; `delivery_fee = MOCK_DELIVERY_FEE`; mã món/size/topping lạ hoặc `items` rỗng → `ApiError(422)`; online → `payment = { expires_at: ISO(created_at + TTL), qr_content: 'COFFEE-<id>-<total>' }` khi còn `awaiting_payment`, ngược lại `null`. `getOrder`: sai mã hoặc sai SĐT (so sánh sau `normalizePhone`) → cùng `ApiError(404, 'Không tìm thấy đơn')`. `simulatePayment`: ghi `paid_at = now` nếu `awaiting_payment`; quá hạn hoặc đơn tiền mặt → `ApiError(409)`.

- [ ] **Step 1: Write the failing tests** (`t0 = 1_000_000`, `iso = (ms) => new Date(ms).toISOString()`)

```js
it.each([[0,'placed'],[14999,'placed'],[15000,'preparing'],[44999,'preparing'],[45000,'delivering'],[89999,'delivering'],[90000,'delivered']])('tiền mặt +%ims → %s', (dt, s) => expect(computeOrderStatus(cash, t0 + dt)).toEqual({ status: s, paymentStatus: 'unpaid' }));
it('online chưa trả, trong hạn → awaiting_payment/pending', () => expect(computeOrderStatus(online, t0 + 299999)).toEqual({ status: 'awaiting_payment', paymentStatus: 'pending' }));
it('online chưa trả, đúng hạn → cancelled/expired', () => expect(computeOrderStatus(online, t0 + 300000)).toEqual({ status: 'cancelled', paymentStatus: 'expired' }));
it('online đã trả tính mốc từ paid_at', () => expect(computeOrderStatus({ ...online, paid_at: iso(t0 + 60000) }, t0 + 75000)).toEqual({ status: 'preparing', paymentStatus: 'paid' }));
it('newOrderId khớp CF + 8 số', ...);   it('loadStoredOrders: JSON hỏng → []', ...);
// adapter (createMockAdapter(0, () => clock), localStorage.clear() mỗi test; request: tra-dao, size m, topping thach, quantity 2)
it('createOrder tiền mặt: subtotal 114000, delivery 15000, total 129000, items[0].unit_price 57000, status placed, payment null', ...);
it('cùng client_request_id trả cùng id và chỉ lưu 1 đơn', ...);   // Review Focus 1
it('product_id lạ → ApiError 422', ...);   it('items rỗng → 422', ...);
it('createOrder online: awaiting_payment, payment.expires_at = created+300000', ...);
it('getOrder khớp SĐT dù gõ "+84 901 234 567"', ...);   // Review Focus 3
it('sai SĐT và sai mã cho cùng status 404 và cùng message', async () => { const a = await adapter.getOrder(id, '0911111111').catch(e => e); const b = await adapter.getOrder('CF99999999', '0901234567').catch(e => e); expect([a.status, a.message]).toEqual([b.status, b.message]); });  // Review Focus 4
it('simulatePayment: sau đó status chuyển sang placed', ...);
it('simulatePayment quá hạn → 409; đơn tiền mặt → 409', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/mocks src/api` → FAIL.
- [ ] **Step 3: Implement** `orderStore.js` và ba hàm adapter; `getOrder` trả đơn đã gộp kết quả `computeOrderStatus(order, now())`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: mock đơn hàng (trạng thái theo thời gian, thanh toán giả lập)`

### Task 5: Http adapter, service và hook đơn hàng

**Files:**
- Modify: `src/api/client.js`, `src/api/adapters/httpAdapter.js`
- Create: `src/services/orderService.js`, `src/hooks/useOrder.js`, `src/hooks/useCreateOrder.js`, `src/hooks/useSimulatePayment.js`
- Test: `src/api/client.test.js`, `src/api/adapters/httpAdapter.test.js`, `src/services/orderService.test.js`, `src/hooks/useOrder.test.jsx`

**Interfaces:**
- Consumes: `toOrder`, `toOrderRequest`, `isFinalStatus`, `POLL_INTERVAL_MS`, `adapter` (`src/api`).
- Produces: `request(path, { baseUrl, params, signal, method = 'GET', body })` — có `body` thì gửi `JSON.stringify(body)` với header `Content-Type: application/json`. Http adapter thêm `createOrder(request)` (`POST /orders`) và `getOrder(id, phone)` (`GET /orders/:id`, query `phone`); **không** định nghĩa `simulatePayment`.
- Produces services: `createOrder(request: object): Promise<Order>`, `getOrder(id: string, phone: string): Promise<Order>`, `simulatePayment(id: string): Promise<Order>` (adapter không có hàm này → ném `Error('simulatePayment chỉ có ở chế độ mock')`).
- Produces hooks: `useOrder(id: string, phone: string)` (`enabled: Boolean(id && phone)`; `refetchInterval` = `POLL_INTERVAL_MS` cho đến khi `isFinalStatus(data.status)` thì `false`; key `['order', id]`); `useCreateOrder()` → mutation, `mutate({ form, items, clientRequestId })` gọi `createOrder(toOrderRequest(...))`; `useSimulatePayment()` → mutation `(id) => simulatePayment(id)`, thành công thì `invalidateQueries(['order', id])`.

- [ ] **Step 1: Write the failing tests**

```js
it('request POST gửi JSON', async () => { /* fetch được gọi với method 'POST', header content-type json, body '{"a":1}' */ });
it('http createOrder POST /orders; getOrder GET /orders/CF1?phone=0901234567', ...);
it('http adapter không có simulatePayment', () => expect(httpAdapter.simulatePayment).toBeUndefined());
it('orderService.createOrder trả Order đã map', ...);   it('getOrder truyền id và phone', ...);
it('simulatePayment thiếu ở adapter ném lỗi nêu "mock"', async () => await expect(simulatePayment('CF1')).rejects.toThrow(/mock/));
it('useOrder không gọi khi thiếu phone', ...);
it('useOrder polling: placed → preparing → delivered rồi dừng', async () => { /* fake timers; getOrder trả 3 trạng thái liên tiếp; sau delivered, tiến 3*POLL_INTERVAL_MS thì số lần gọi không đổi */ });
it('useOrder không thử lại khi 404', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/api src/services src/hooks` → FAIL.
- [ ] **Step 3: Implement** theo Interfaces.
- [ ] **Step 4: Run** → PASS (toàn bộ suite giai đoạn 1 vẫn xanh).
- [ ] **Step 5: Commit** `feat: http adapter, service và hook đơn hàng (polling)`

### Task 6: Đơn gần đây

**Files:**
- Create: `src/features/orders/recentOrders.js`
- Test: `src/features/orders/recentOrders.test.js`

**Interfaces:**
- Consumes: `RECENT_ORDERS_KEY`, `RECENT_ORDERS_VERSION`, `RECENT_ORDERS_MAX`.
- Produces: `loadRecentOrders(): { id: string, phone: string, createdAt: string }[]` (mới nhất trước); `addRecentOrder(entry): entry[]` (đưa `id` trùng lên đầu và thay SĐT, cắt còn `RECENT_ORDERS_MAX`, ghi lại, trả danh sách mới); `findRecentOrder(id: string): entry | undefined`. Dạng lưu `{version: 1, items}`; mọi đọc/ghi bọc `try/catch`, dữ liệu hỏng hoặc sai version → `[]` + `console.warn`, ghi lỗi chỉ `console.warn`.

- [ ] **Step 1: Write the failing tests**

```js
it('add rồi load trả lại, mới nhất trước', ...);
it('trùng id: lên đầu, không nhân đôi, cập nhật SĐT', ...);
it('thêm 11 đơn chỉ giữ 10 đơn mới nhất', ...);
it('findRecentOrder trả đúng đơn; id lạ → undefined', ...);
it('JSON hỏng / sai version → [] và warn', ...);
it('setItem ném QuotaExceededError → addRecentOrder không ném', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/features/orders/recentOrders.test.js` → FAIL.
- [ ] **Step 3: Implement** (theo mẫu `src/features/cart/storage.js`).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: lưu đơn gần đây`

### Task 7: Thành phần form thanh toán

**Files:**
- Create: `src/components/AddressFields.jsx`, `PaymentMethodPicker.jsx`, `OrderSummary.jsx` (+ CSS Modules)
- Test: `src/components/AddressFields.test.jsx`, `PaymentMethodPicker.test.jsx`, `OrderSummary.test.jsx`

**Interfaces:**
- Consumes: `useProvinces`, `useWards`, `PAYMENT_METHODS`, `formatVnd`, `ErrorState`.
- Produces: `<AddressFields value={{provinceId, wardId, street}} errors={Partial<Record<'provinceId'|'wardId'|'street',string>>} onChange={(patch) => void} />` — ô có nhãn "Tỉnh/Thành", "Phường/Xã", "Số nhà, tên đường"; mỗi ô có `id="field-<tên trường>"`, `aria-invalid` và `aria-describedby` khi có lỗi; "Phường/Xã" bị khóa tới khi chọn tỉnh; đổi tỉnh gọi `onChange({ provinceId, wardId: '' })`; tải tỉnh/phường lỗi hiện `ErrorState` với Thử lại.
- Produces: `<PaymentMethodPicker value={string} onChange={(id) => void} error?={string} />` (radio theo `PAYMENT_METHODS`, nhãn lấy từ `label`).
- Produces: `<OrderSummary lines={{key, name, summary, note, quantity, lineTotal}[]} subtotal={number} deliveryFee?={number} total?={number} />` — luôn hiện "Tạm tính"; chỉ hiện "Phí giao hàng" và "Tổng cộng" khi có `deliveryFee`/`total`.

- [ ] **Step 1: Write the failing tests** (AddressFields chạy với `createMockAdapter(0)` qua `vi.mock('../api')`)

```js
it('phường bị khóa tới khi chọn tỉnh', () => expect(screen.getByLabelText('Phường/Xã')).toBeDisabled());
it('chọn Hà Nội → 4 phường "Phường Mẫu 1..4"', async () => { await userEvent.selectOptions(screen.getByLabelText('Tỉnh/Thành'), 'hn'); expect(await screen.findByRole('option', { name: 'Phường Mẫu 4' })).toBeInTheDocument(); });
it('đổi tỉnh gọi onChange({ provinceId: "hcm", wardId: "" })', ...);
it('có lỗi → aria-invalid và thông điệp hiện ra', ...);
it('lỗi tải tỉnh hiện ErrorState; Thử lại tải lại được', ...);
it('PaymentMethodPicker: 3 radio, chọn "Chuyển khoản QR" gọi onChange("bank_transfer")', ...);
it('OrderSummary chỉ tạm tính; có deliveryFee và total thì hiện đủ ba dòng đúng định dạng VND', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/components/AddressFields.test.jsx src/components/PaymentMethodPicker.test.jsx src/components/OrderSummary.test.jsx` → FAIL.
- [ ] **Step 3: Implement** ba thành phần.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: thành phần form thanh toán`

### Task 8: Trang Thanh toán (`/checkout`)

**Files:**
- Create: `src/pages/CheckoutPage.jsx` (+ CSS Modules)
- Modify: `src/App.jsx` (route `checkout` → `CheckoutPage`), xóa `src/pages/CheckoutPlaceholderPage.jsx`
- Test: `src/pages/CheckoutPage.test.jsx`

**Interfaces:**
- Consumes: `useCart` (`items`, `clear`), `selectSubtotal`, `validateCheckout`, `FIELD_ORDER`, `useCreateOrder`, `newRequestId`, `addRecentOrder`, `isOnlinePayment`, `AddressFields`, `PaymentMethodPicker`, `OrderSummary`, `EmptyState`.
- Produces: `<CheckoutPage />`. Họ tên, SĐT, ghi chú có `id="field-name"`, `field-phone`, `field-note` và nhãn "Họ tên", "Số điện thoại", "Ghi chú". `clientRequestId` tạo một lần cho mỗi lần thử (`useRef`), tạo mới sau khi đặt thành công. Bấm "Đặt hàng": kiểm tra → lỗi thì hiện dưới ô và `focus()` ô sai đầu tiên theo `FIELD_ORDER`; hợp lệ thì gửi; nút vô hiệu khi đang gửi. Thành công: `addRecentOrder({ id, phone, createdAt })`, `clear()` giỏ, chuyển tới `/payment/<id>` (online) hoặc `/orders/<id>` (tiền mặt). Thất bại: `role="alert"` phía trên nút với `error.message`, giữ giỏ và form. Giỏ trống: `EmptyState` + link "Về Menu".

- [ ] **Step 1: Write the failing tests** (cart seed trong `localStorage`; `vi.mock('../api')` dùng `createMockAdapter(0)`; `LocationDisplay` để đọc URL)

```js
it('giỏ trống hiện EmptyState và link về /menu', ...);
it('bấm Đặt hàng khi form rỗng: hiện lỗi từng ô và focus vào ô Họ tên', () => expect(screen.getByLabelText('Họ tên')).toHaveFocus());
it('đổi tỉnh làm trống phường đã chọn', ...);
it('đặt tiền mặt thành công: giỏ trống, đơn vào đơn gần đây, URL /orders/CF........', ...);
it('đặt chuyển khoản: URL /payment/CF........', ...);
it('đặt lỗi: alert hiện, giỏ còn nguyên, giá trị form còn nguyên', async () => { vi.spyOn(adapter, 'createOrder').mockRejectedValue(new ApiError(500, 'Máy chủ trả lỗi 500')); /* ... */ });
it('bấm Đặt hàng hai lần liên tiếp chỉ gọi createOrder một lần', async () => { /* spy createOrder; dblClick; expect(spy).toHaveBeenCalledTimes(1) */ });   // Review Focus 1
it('request gửi đi không chứa giá', () => expect(JSON.stringify(spy.mock.calls[0][0])).not.toMatch(/price/i));
```

- [ ] **Step 2: Run** `npx vitest run src/pages/CheckoutPage.test.jsx` → FAIL.
- [ ] **Step 3: Implement** `CheckoutPage` và nối route; `src/App.test.jsx` vẫn xanh.
- [ ] **Step 4: Run** `npx vitest run` → PASS toàn bộ.
- [ ] **Step 5: Commit** `feat: trang thanh toán /checkout`

### Task 9: Trang trả tiền giả lập (`/payment/:id`)

**Files:**
- Create: `src/components/QrPlaceholder.jsx`, `src/components/PhoneGate.jsx`, `src/hooks/useCountdown.js`, `src/pages/PaymentPage.jsx` (+ CSS Modules)
- Modify: `src/App.jsx` (route `payment/:id`)
- Test: `src/components/QrPlaceholder.test.jsx`, `src/hooks/useCountdown.test.js`, `src/pages/PaymentPage.test.jsx`

**Interfaces:**
- Consumes: `useOrder`, `useSimulatePayment`, `findRecentOrder`, `addRecentOrder`, `isOnlinePayment`, `formatVnd`, `env`, `ErrorState`, `isValidPhone`.
- Produces: `<QrPlaceholder content: string />` — SVG lưới 21×21 sinh xác định từ `content`, `role="img"`, nhãn "Mã QR mẫu", kèm chú thích "Mã QR mẫu, không quét được"; `useCountdown(expiresAtIso: string | undefined): number` (ms còn lại, cập nhật mỗi giây, tối thiểu 0); `<PhoneGate onSubmit={(phone: string) => void} />` (ô "Số điện thoại" + nút "Xem đơn", báo lỗi nếu `!isValidPhone`, gọi `onSubmit` với số đã chuẩn hóa).
- Produces `<PaymentPage />`: SĐT lấy từ `findRecentOrder(id)`; không có thì hiện `PhoneGate`. Đơn `awaiting_payment`: hiện `QrPlaceholder` (`payment.qrContent`), `total` (VND), đồng hồ `mm:ss`, và nút "Giả lập đã thanh toán" **chỉ khi `env.apiMode === 'mock'`**. Đơn tiền mặt hoặc `paymentStatus=paid` → chuyển sang `/orders/<id>`. `paymentStatus=expired` hoặc `status=cancelled` → "Đơn đã hết hạn thanh toán" + link "Về Menu".

- [ ] **Step 1: Write the failing tests**

```js
it('QrPlaceholder: cùng content cho cùng SVG, khác content cho SVG khác', ...);
it('QrPlaceholder có role img tên "Mã QR mẫu"', ...);
it('useCountdown giảm mỗi giây và dừng ở 0', () => { /* fake timers: expiresAt = now+3000 → 3000, 2000, ..., 0, tiến thêm vẫn 0 */ });
it('useCountdown với hạn đã qua → 0 ngay (không âm)', ...);   // Review Focus 5
it('PaymentPage đơn online mới: hiện tổng tiền, QR và đồng hồ "05:00"', ...);
it('bấm "Giả lập đã thanh toán" → chuyển tới /orders/<id>', ...);
it('đơn tiền mặt → chuyển thẳng /orders/<id>', ...);
it('đơn quá hạn: hiện "Đơn đã hết hạn thanh toán", đồng hồ "00:00", có link Về Menu', ...);   // Review Focus 5
it('chưa có trong đơn gần đây → hiện PhoneGate; nhập SĐT đúng thì tải đơn', ...);
it('PhoneGate: SĐT sai hiện lỗi và không gọi onSubmit', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/components/QrPlaceholder.test.jsx src/hooks/useCountdown.test.js src/pages/PaymentPage.test.jsx` → FAIL.
- [ ] **Step 3: Implement**; nút giả lập gọi `useSimulatePayment`, trang tự chuyển khi polling thấy `paymentStatus=paid`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: trang thanh toán giả lập /payment/:id`

### Task 10: Theo dõi đơn và tra cứu (`/orders`, `/orders/:id`)

**Files:**
- Create: `src/components/OrderProgress.jsx`, `src/pages/OrderTrackingPage.jsx`, `src/pages/OrdersPage.jsx` (+ CSS Modules)
- Modify: `src/App.jsx` (route `orders`, `orders/:id`), `src/components/Header.jsx` (link "Đơn hàng" → `/orders`), `src/components/Header.test.jsx`
- Test: `src/components/OrderProgress.test.jsx`, `src/pages/OrderTrackingPage.test.jsx`, `src/pages/OrdersPage.test.jsx`

**Interfaces:**
- Consumes: `useOrder`, `getOrder` (`orderService`), `findRecentOrder`, `addRecentOrder`, `loadRecentOrders`, `PhoneGate`, `OrderSummary`, `STATUS_LABELS`, `PAYMENT_STATUS_LABELS`, `PROGRESS_STEPS`, `isFinalStatus`, `isValidPhone`, `normalizePhone`.
- Produces: `<OrderProgress status />` — danh sách bước theo `PROGRESS_STEPS` với nhãn từ `STATUS_LABELS`; bước hiện tại `aria-current="step"`; `awaiting_payment` hiện nhãn "Chờ thanh toán" không bước nào hiện tại; `cancelled` hiện `role="alert"` "Đã hủy".
- Produces `<OrderTrackingPage />`: SĐT từ `findRecentOrder(id)` hoặc `PhoneGate`; hiện "Mã đơn", `OrderProgress`, `OrderSummary` (có phí giao và tổng), địa chỉ, ngày giờ (`toLocaleString('vi-VN')`), `PAYMENT_STATUS_LABELS`; đơn `awaiting_payment` có link "Thanh toán ngay" → `/payment/<id>`. Tải thành công thì `addRecentOrder`. 404 → "Không tìm thấy đơn với mã và số điện thoại này." Polling lỗi sau lần tải đầu → giữ dữ liệu cũ + dòng "Mất kết nối, đang thử lại".
- Produces `<OrdersPage />`: form "Mã đơn" + "Số điện thoại" (`isValidPhone` trước khi gọi `getOrder`); thành công → `addRecentOrder` và chuyển `/orders/<id>`; 404 → **cùng** thông báo "Không tìm thấy đơn với mã và số điện thoại này." (`role="alert"`); danh sách đơn gần đây (link `/orders/<id>`, ngày giờ).

- [ ] **Step 1: Write the failing tests**

```js
it('OrderProgress preparing: "Đang pha chế" là aria-current="step"', ...);
it('OrderProgress cancelled: alert "Đã hủy"; awaiting_payment: không bước nào aria-current', ...);
it('Tracking: hiện mã đơn, món, phí giao, tổng, trạng thái thanh toán', ...);
it('Tracking: sai SĐT trong đơn gần đây → "Không tìm thấy đơn với mã và số điện thoại này."', ...);   // Review Focus 4
it('Tracking: chưa có trong đơn gần đây → PhoneGate, nhập đúng thì hiện đơn và lưu vào đơn gần đây', ...);
it('Tracking: polling mất kết nối sau lần đầu → giữ dữ liệu và hiện "Mất kết nối, đang thử lại"', ...);
it('Tracking: đơn awaiting_payment có link "Thanh toán ngay" → /payment/<id>', ...);
it('Orders: tra đúng mã + "+84 901 234 567" → chuyển /orders/<id>', ...);   // Review Focus 3
it('Orders: sai SĐT và sai mã cho cùng một thông báo', async () => { /* hai lần submit, so sánh textContent của alert */ });   // Review Focus 4
it('Orders: SĐT sai định dạng báo lỗi và không gọi getOrder', ...);
it('Orders: danh sách đơn gần đây có link /orders/<id>', ...);
it('Header có link "Đơn hàng" → /orders', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/components/OrderProgress.test.jsx src/pages/OrderTrackingPage.test.jsx src/pages/OrdersPage.test.jsx src/components/Header.test.jsx` → FAIL.
- [ ] **Step 3: Implement**; trang theo dõi dùng `useOrder` (polling đã có ở Task 5).
- [ ] **Step 4: Run** `npx vitest run` → PASS toàn bộ.
- [ ] **Step 5: Commit** `feat: theo dõi đơn và tra cứu đơn`

### Task 11: Tài liệu và kiểm tra cuối

**Files:**
- Modify: `README.md`
- Test: toàn bộ

**Interfaces:** không có.

- [ ] **Step 1: Cập nhật `README.md`:** bỏ dòng "`/checkout` là trang giữ chỗ"; thêm mục các trang mới, hợp đồng API giả định của giai đoạn 2 (chép từ spec mục 7), lưu ý về `simulatePayment` chỉ có ở mock, và mục "Chưa có" còn lại (đăng nhập, cửa hàng, ưu đãi, cổng thanh toán thật).
- [ ] **Step 2: Run** `npm test` → mọi test PASS; `npm run build` → thành công, không cảnh báo mới; `VITE_API_MODE=http VITE_API_BASE_URL=https://api.example.com/v1 npm run build` → thành công.
- [ ] **Step 3: Kiểm tra thủ công** bằng `npm run dev` ở 1280px và 1024px: thêm món → `/checkout` (thử bấm Đặt hàng với form rỗng) → đặt đơn tiền mặt → xem tiến trình đi `placed → delivered`; đặt đơn chuyển khoản → `/payment/:id` → "Giả lập đã thanh toán" → theo dõi; tải lại trang giữa chừng; mở `/orders`, tra bằng mã đơn + SĐT, thử SĐT sai. Ghi kết quả từng bước; chỗ nào chưa chạy thật (không có trình duyệt) thì nói rõ là chưa chạy.
- [ ] **Step 4: Commit** `docs: README và kiểm tra giai đoạn 2`
