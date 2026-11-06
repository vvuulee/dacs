# Coffee Web Giai đoạn 4 (Cửa hàng và Ưu đãi) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm trang Cửa hàng (chỉ xem, lọc theo tỉnh, tìm theo tên, link "Chỉ đường"), trang Ưu đãi (sao chép mã) và ô mã giảm giá ở trang Thanh toán (backend kiểm tra và trả mức giảm, đơn đặt kèm mã).

**Architecture:** Giữ luồng `component → hook → service → adapter (mock | http) → mapper → model`. Mức giảm do backend tính (mock dùng chung một `voucherEngine` cho `validate` và `createOrder`); frontend chỉ hiển thị. `client.js` đọc `message`/`code` từ phản hồi lỗi để hiện lý do thật.

**Tech Stack:** như giai đoạn 1–3 (React, Vite, React Router v7, TanStack Query v5, CSS Modules, Vitest + Testing Library). Không thêm dependency.

**Spec:** `docs/superpowers/specs/2026-10-30-coffee-web-phase4-design.md` (nền: spec giai đoạn 1–3). Nhánh: `feat/phase4`. Làm việc trong `/home/claude/coffee-web` (thư mục outputs không hỗ trợ symlink nên `npm install` hỏng ở đó); xong thì đồng bộ về outputs, bỏ `node_modules` và `dist`.

## Global Constraints

- Giao diện tiếng Việt, cam `#fb8d17`, desktop từ 1024px; màu/khoảng cách dùng tokens trong `src/styles/tokens.css`. Không thêm dependency.
- Hằng số mới trong `src/constants.js`: `VOUCHER_CODE_MIN=3`, `VOUCHER_CODE_MAX=32`, `ERROR_MESSAGE_MAX=300`, `VOUCHER_INVALID_CODE='voucher_invalid'`. Mã giảm giá khớp `^[A-Z0-9-]{3,32}$` sau khi bỏ mọi khoảng trắng và đổi chữ hoa.
- Request kiểm tra mã và request đặt hàng **không gửi giá**; `total = subtotal + deliveryFee − discount` do backend tính, frontend không tự cộng trừ.
- Link "Chỉ đường" luôn do frontend tự dựng với tiền tố cố định `https://www.google.com/maps/search/?api=1&query=` + địa chỉ đã `encodeURIComponent`, mở tab mới với `rel="noopener noreferrer"`; **không bao giờ** dùng URL hay link do backend trả về. Link `tel:` chỉ giữ chữ số và dấu `+`.
- Trạng thái "mã đã áp" chỉ nằm trong state của `CheckoutPage` (không lưu `localStorage`); không ghi mã giảm giá, số điện thoại, token hay mật khẩu ra log.
- Dữ liệu mock là hư cấu: "Cửa hàng Mẫu 1…", địa chỉ/số điện thoại giả; không dùng tên, địa chỉ, logo thật của The Coffee House.
- Chuỗi dùng chung đặt trong `src/features/vouchers/messages.js` (Task 1): `VOUCHER_FORMAT_TEXT='Mã giảm giá không hợp lệ'`, `VOUCHER_UNUSABLE_TEXT='Mã giảm giá không dùng được'`, `VOUCHER_CART_CHANGED_TEXT='Giỏ hàng đã thay đổi, hãy áp lại mã'`, `COPY_FAILED_TEXT='Không sao chép được, hãy chọn và sao chép mã'`, `NO_STORES_TEXT='Không tìm thấy cửa hàng nào'`, `NO_OFFERS_TEXT='Hiện chưa có ưu đãi nào'`.
- Code theo `coding-hieu-qua` (không magic number, early return, không nuốt lỗi); task giao diện đọc `frontend-design` (focus nhìn thấy được, `prefers-reduced-motion`). Tái dùng `FormField`/`fieldProps`, `ErrorState`, `EmptyState`, `Skeleton`, `useProvinces`, `useDebouncedValue`, `formatVnd`, `normalizeText`.
- Ngoài phạm vi: chọn cửa hàng khi đặt hàng, bản đồ nhúng, sắp theo khoảng cách, "đang mở/đóng", kho voucher của tài khoản, áp mã ở giỏ hàng, nhớ mã khi tải lại trang, `/orders/quote`, phân trang cửa hàng.

## Review Focus

1. Mã hết hạn đúng lúc đặt: hiện lý do thật, gỡ mã, **giỏ và form còn nguyên**, `clientRequestId` mới, bấm đặt lại thì đặt được không mã (Task 9).
2. Giỏ đổi sau khi áp mã: mã mất hiệu lực, hiện `VOUCHER_CART_CHANGED_TEXT`, **không** gửi `voucher_code` (Task 9).
3. Áp một mã sai khi đang có mã hợp lệ: mã đang áp giữ nguyên, chỉ hiện lý do dưới ô nhập (Task 8).
4. Mức giảm xem trước bằng đúng mức giảm trong đơn; không bao giờ vượt tạm tính (hoặc phí giao với freeship); tổng không âm (Tasks 3, 4).
5. "Chỉ đường" và `tel:` an toàn: tên/địa chỉ chứa `"`, `<`, `&`, `javascript:` vẫn nằm trọn trong tham số `query` đã mã hóa; số điện thoại có chữ lạ không chèn được vào `tel:` (Task 6).
6. Phản hồi lỗi không phải JSON, thiếu `message`, hoặc `message` rất dài vẫn cho thông điệp dùng được (Task 1).

---

### Task 1: Nền tảng (hằng số, chuẩn hóa mã, thông báo, đọc lỗi trong client)

**Files:**
- Modify: `src/constants.js`, `src/api/client.js`
- Create: `src/features/vouchers/normalizeCode.js`, `src/features/vouchers/messages.js`
- Test: `src/features/vouchers/normalizeCode.test.js`, `src/api/client.test.js`

**Interfaces:**
- Produces `normalizeCode.js`: `normalizeVoucherCode(input: unknown): string` (`String(input ?? '')`, bỏ mọi khoảng trắng, chữ hoa); `isVoucherCode(code: string): boolean` (khớp `^[A-Z0-9-]+$` và độ dài từ `VOUCHER_CODE_MIN` đến `VOUCHER_CODE_MAX`).
- Produces `messages.js`: các chuỗi ở Global Constraints.
- Sửa `ApiError`: `constructor(status: number, message: string, code?: string)`, thêm thuộc tính `code`. `request`: phản hồi không ok thì đọc `response.json()` trong `try/catch` (thiếu `json()` hoặc không phải JSON → bỏ qua); `message` là chuỗi không rỗng sau `trim()` thì dùng, cắt tối đa `ERROR_MESSAGE_MAX` ký tự, ngược lại giữ `Máy chủ trả lỗi ${status}`; `code` là chuỗi thì giữ, ngược lại `undefined`. Hành vi 401/204/202 và Bearer giữ nguyên.

- [ ] **Step 1: Write the failing tests**

```js
// normalizeCode
it.each([[' chao10 ', 'CHAO10'], ['giam 20k', 'GIAM20K'], ['', ''], [null, ''], [undefined, ''], [42, '42']])('normalizeVoucherCode(%j) → %j', (input, expected) => expect(normalizeVoucherCode(input)).toBe(expected));
it.each(['CHAO10', 'FREE-SHIP', 'ABC'])('%s hợp lệ', v => expect(isVoucherCode(v)).toBe(true));
it.each(['AB', 'A'.repeat(33), 'chao10', 'CHAO 10', 'CHAO_10', 'CHÀO10', ''])('"%s" không hợp lệ', v => expect(isVoucherCode(v)).toBe(false));
it('độ dài biên: 3 và 32 ký tự hợp lệ', () => { expect(isVoucherCode('A'.repeat(3))).toBe(true); expect(isVoucherCode('A'.repeat(32))).toBe(true); });
// client (thêm vào file hiện có; phản hồi lỗi giả có json())
it('lỗi có JSON {message, code} → ApiError mang đúng message và code', async () => { /* 422 json: {message:'Mã giảm giá đã hết hạn', code:'voucher_invalid'} */ await expect(request('/orders', { baseUrl: '/api', method: 'POST', body: {} })).rejects.toMatchObject({ status: 422, message: 'Mã giảm giá đã hết hạn', code: 'voucher_invalid' }); });
it('lỗi không có json() (đối tượng giả cũ) → thông điệp chung và code undefined', async () => { /* { ok:false, status:404 } */ await expect(...).rejects.toMatchObject({ status: 404, message: 'Máy chủ trả lỗi 404', code: undefined }); });
it('lỗi có thân không phải JSON (json() ném) → thông điệp chung', ...);
it.each([[{}], [{ message: '' }], [{ message: '   ' }], [{ message: 42 }]])('thân lỗi %j thiếu message dùng được → thông điệp chung', ...);
it('message dài hơn 300 ký tự bị cắt còn 300', async () => { /* message 'a'.repeat(500) → message.length 300 */ });
it('code không phải chuỗi bị bỏ', ...);
it('401 có token vẫn gọi handler và message lấy từ thân lỗi nếu có', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/features/vouchers src/api/client.test.js` → FAIL.
- [ ] **Step 3: Implement** theo Interfaces; thêm bốn hằng số vào `constants.js`.
- [ ] **Step 4: Run** `npx vitest run` → PASS toàn bộ.
- [ ] **Step 5: Commit** `feat: chuẩn hóa mã giảm giá và đọc message/code từ lỗi`

### Task 2: Mapper (cửa hàng, ưu đãi, voucher, đơn có giảm giá)

**Files:**
- Create: `src/mappers/store.js`, `src/mappers/offer.js`, `src/mappers/voucher.js`
- Modify: `src/mappers/order.js`
- Test: `src/mappers/store.test.js`, `offer.test.js`, `voucher.test.js`, `order.test.js`

**Interfaces:**
- Consumes: `mapList`, `requireField`, `requireMoney` (`src/mappers/shared.js`).
- Produces: `toStore(raw): {id, name, street, wardName, provinceId, provinceName, phone, openingHours}` (thô `{id, name, province_id, province_name, ward_name, street, phone, opening_hours}`; `id` thành chuỗi; thiếu `id`/`name` → ném lỗi nêu tên trường; các trường còn lại mặc định `''`); `toStores(list)` bỏ phần tử hỏng + `console.warn`.
- Produces: `toOffer(raw): {id, title, description, code, minOrder, expiresAt}` (thô `{id, title, description, code, min_order, expires_at}`; thiếu `id`/`title`/`code` → ném lỗi; `description` mặc định `''`; `min_order` `null`/thiếu → `null` còn lại `requireMoney`; `expires_at` thiếu → `null`); `toOffers(list)` như trên.
- Produces `voucher.js`: `toVoucherResult(raw): {valid: true, code, title, discount} | {valid: false, reason}` (`valid === true` cần `code`, `title`, `discount` là số nguyên ≥ 0, thiếu/sai → ném lỗi nêu trường; `valid === false` lấy `reason` chuỗi không rỗng, thiếu → `VOUCHER_UNUSABLE_TEXT`; giá trị khác của `valid` → ném lỗi); `toVoucherRequest({code, items: CartItem[]}): {code, items: {product_id, size_id, topping_ids, quantity}[]}` (topping sắp xếp, **không** có `note` và không có giá).
- Sửa `order.js`: xuất `toRequestItem(item: CartItem): {product_id, size_id, topping_ids, note, quantity}` (đúng phần ánh xạ món hiện có) và `toOrderRequest({form, items, clientRequestId, voucherCode?})` thêm `voucher_code` **chỉ khi** `voucherCode` có giá trị; `toOrder` thêm `discount = raw.discount ?? 0` (số nguyên ≥ 0, sai → ném lỗi nêu `discount`) và `voucherCode = raw.voucher_code ?? null`.

- [ ] **Step 1: Write the failing tests**

```js
it('toStore map snake_case', () => expect(toStore({ id: 3, name: 'Cửa hàng Mẫu 1', province_id: 'hn', province_name: 'Hà Nội', ward_name: 'Phường Mẫu 1', street: '12 Phố Mẫu', phone: '02800000001', opening_hours: '07:00 – 22:00' })).toEqual({ id: '3', name: 'Cửa hàng Mẫu 1', street: '12 Phố Mẫu', wardName: 'Phường Mẫu 1', provinceId: 'hn', provinceName: 'Hà Nội', phone: '02800000001', openingHours: '07:00 – 22:00' }));
it('toStore thiếu trường tùy chọn → ""', () => expect(toStore({ id: 1, name: 'A' })).toMatchObject({ street: '', phone: '', openingHours: '', provinceId: '' }));
it.each(['id', 'name'])('toStore thiếu %s ném lỗi nêu tên', f => expect(() => toStore({ id: 1, name: 'A', [f]: undefined })).toThrow(new RegExp(f)));
it('toStores bỏ phần tử hỏng và warn một lần', ...);
it('toOffer: min_order/expires_at null → null; có giá trị thì map', () => { expect(toOffer({ id: 1, title: 'T', code: 'ABC', min_order: null })).toMatchObject({ minOrder: null, expiresAt: null, description: '' }); expect(toOffer({ id: 1, title: 'T', code: 'ABC', min_order: 50000, expires_at: '2099-01-01T00:00:00.000Z' })).toMatchObject({ minOrder: 50000, expiresAt: '2099-01-01T00:00:00.000Z' }); });
it.each(['id', 'title', 'code'])('toOffer thiếu %s ném lỗi', ...);   it('toOffer min_order âm ném lỗi nêu min_order', ...);   it('toOffers bỏ phần tử hỏng', ...);
it('toVoucherResult hợp lệ', () => expect(toVoucherResult({ valid: true, code: 'CHAO10', title: 'Giảm 10%', discount: 10200 })).toEqual({ valid: true, code: 'CHAO10', title: 'Giảm 10%', discount: 10200 }));
it('toVoucherResult không hợp lệ giữ reason; thiếu reason → VOUCHER_UNUSABLE_TEXT', ...);
it.each([[{ valid: true, code: 'A', title: 'T', discount: -1 }], [{ valid: true, code: 'A', title: 'T' }], [{ valid: 'yes' }], [{}]])('toVoucherResult %j ném lỗi', ...);
it('toVoucherRequest: món gửi {product_id,size_id,topping_ids sắp xếp,quantity}, không note, không price', () => { const req = toVoucherRequest({ code: 'CHAO10', items: [{ productId: 'tra-dao', sizeId: 'm', toppingIds: ['b', 'a'], note: 'ít đá', quantity: 2, unitPrice: 57000, name: 'x', image: '', summary: '', key: 'k' }] }); expect(req).toEqual({ code: 'CHAO10', items: [{ product_id: 'tra-dao', size_id: 'm', topping_ids: ['a', 'b'], quantity: 2 }] }); expect(JSON.stringify(req)).not.toMatch(/price|note/i); });
// order
it('toOrder: thiếu discount → 0, voucherCode null; có thì map', ...);   it.each([-1, 1.5, 'x'])('toOrder discount %s ném lỗi nêu discount', ...);
it('toOrderRequest: có voucherCode → voucher_code; không có/rỗng/null → không có khóa voucher_code', () => { expect(toOrderRequest({ ...args, voucherCode: 'CHAO10' }).voucher_code).toBe('CHAO10'); expect('voucher_code' in toOrderRequest(args)).toBe(false); expect('voucher_code' in toOrderRequest({ ...args, voucherCode: '' })).toBe(false); });
it('toRequestItem giữ note đã trim và topping sắp xếp', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/mappers` → FAIL.
- [ ] **Step 3: Implement** theo Interfaces; `toOrderRequest` dùng `toRequestItem`.
- [ ] **Step 4: Run** `npx vitest run` → PASS (test mapper đơn cũ vẫn xanh).
- [ ] **Step 5: Commit** `feat: mapper cửa hàng, ưu đãi, voucher và đơn có giảm giá`

### Task 3: Dữ liệu mock và `voucherEngine`

**Files:**
- Create: `src/mocks/stores.js`, `src/mocks/offers.js`, `src/mocks/voucherEngine.js`
- Test: `src/mocks/voucherEngine.test.js`, `src/mocks/stores.test.js`

**Interfaces:**
- Consumes: `formatVnd`, `normalizeVoucherCode`.
- Produces `stores.js`: `stores` (thô, 9 cửa hàng "Cửa hàng Mẫu 1…9", 3 cho mỗi `province_id` `hn`/`hcm`/`dn` với `province_name` `Hà Nội`/`TP. Hồ Chí Minh`/`Đà Nẵng` đúng như `src/mocks/addresses.js`; `ward_name` "Phường Mẫu n", `street` giả, `phone` giả dạng `0280000000n`, `opening_hours` "07:00 – 22:00" hoặc "06:30 – 21:30").
- Produces `offers.js`: `vouchers` (bảng `{id, title, description, code, type: 'percent'|'fixed'|'freeship', value, max_discount, min_order, expires_at, listed}`): `CHAO10` percent 10 tối đa 30000, đơn từ 50000; `GIAM20K` fixed 20000, đơn từ 100000; `FREESHIP` freeship, đơn từ 80000; `COMBO15` percent 15 tối đa 50000, đơn từ 150000 (cả bốn `listed: true`, `expires_at: '2099-01-01T00:00:00.000Z'`); `HETHAN` percent 50, `expires_at: '2000-01-01T00:00:00.000Z'`, `listed: false`.
- Produces `voucherEngine.js`: `evaluateVoucher(code: string, subtotal: number, deliveryFee: number, now: number, table = vouchers): { ok: true, voucher, discount } | { ok: false, reason }`. Thứ tự kiểm tra: mã (`normalizeVoucherCode`, so khớp không phân biệt hoa thường) không có → `'Mã giảm giá không tồn tại'`; `Date.parse(expires_at) <= now` → `'Mã giảm giá đã hết hạn'`; `subtotal < min_order` → `` `Đơn hàng cần từ ${formatVnd(min_order)} để dùng mã này` ``. Mức giảm: percent = `Math.floor(subtotal * value / 100)` cắt ở `max_discount`; fixed = `Math.min(value, subtotal)`; freeship = `deliveryFee`.

- [ ] **Step 1: Write the failing tests** (`NOW = Date.parse('2026-10-30T00:00:00Z')`, `FEE = 15000`; so sánh chữ có `formatVnd` qua `.replace(/\s/g, ' ')`)

```js
it.each([['CHAO10', 100000, 10000], ['CHAO10', 50000, 5000], ['CHAO10', 400000, 30000], ['GIAM20K', 100000, 20000], ['FREESHIP', 80000, 15000], ['COMBO15', 150000, 22500], ['COMBO15', 400000, 50000]])('%s với tạm tính %i → giảm %i', (code, subtotal, expected) => expect(evaluateVoucher(code, subtotal, FEE, NOW)).toMatchObject({ ok: true, discount: expected }));
it('mã chữ thường và có khoảng trắng vẫn khớp', () => expect(evaluateVoucher(' chao10 ', 100000, FEE, NOW)).toMatchObject({ ok: true, discount: 10000 }));
it('mã lạ → "Mã giảm giá không tồn tại"', ...);
it('HETHAN → "Mã giảm giá đã hết hạn" (kiểm tra hết hạn trước đơn tối thiểu)', () => expect(evaluateVoucher('HETHAN', 1, FEE, NOW)).toEqual({ ok: false, reason: 'Mã giảm giá đã hết hạn' }));
it('đúng mốc hết hạn là đã hết hạn; trước 1ms còn hạn', () => { const table = [{ ...cho, expires_at: new Date(NOW).toISOString() }]; ... });
it.each([['CHAO10', 49999, '50.000 ₫'], ['GIAM20K', 99999, '100.000 ₫'], ['FREESHIP', 79999, '80.000 ₫'], ['COMBO15', 149999, '150.000 ₫']])('%s dưới đơn tối thiểu → lý do nêu %s', (code, subtotal, money) => expect(evaluateVoucher(code, subtotal, FEE, NOW).reason.replace(/\s/g, ' ')).toBe(`Đơn hàng cần từ ${money} để dùng mã này`));
it('fixed không vượt tạm tính (bảng thử: value 50000, min 0, tạm tính 30000 → 30000)', ...);   // Review Focus 4
it('mức giảm không bao giờ vượt tạm tính (percent/fixed) hay phí giao (freeship) trên nhiều tạm tính', () => { for (const subtotal of [0, 1, 999, 100000, 1e7]) for (const code of ['CHAO10', 'GIAM20K', 'FREESHIP', 'COMBO15']) { const r = evaluateVoucher(code, subtotal, FEE, NOW); if (r.ok) expect(r.discount).toBeLessThanOrEqual(code === 'FREESHIP' ? FEE : subtotal); } });
it('stores: 9 cửa hàng, 3 mỗi tỉnh, province_name khớp mocks/addresses', ...);   it('mọi mã voucher duy nhất và khớp ^[A-Z0-9-]{3,32}$', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/mocks` → FAIL.
- [ ] **Step 3: Implement** ba file.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: dữ liệu mock cửa hàng, voucher và voucherEngine`

### Task 4: Adapter mock (cửa hàng, ưu đãi, kiểm tra mã, đặt hàng có mã)

**Files:**
- Modify: `src/mocks/orderStore.js`, `src/api/adapters/mockAdapter.js`
- Test: `src/api/adapters/mockVouchers.test.js`

**Interfaces:**
- Consumes: `stores`, `vouchers`, `evaluateVoucher`, `normalizeText`, `normalizeVoucherCode`, `MOCK_DELIVERY_FEE`, `VOUCHER_INVALID_CODE`, `ApiError(status, message, code)` (Task 1).
- Produces `orderStore.js`: xuất `priceItems(items): { items: PricedItem[], subtotal: number }` (tách từ phần tính giá đang có trong `buildStoredOrder`; món/size/topping lạ → `ApiError(422)`); `buildStoredOrder` xử lý `request.voucher_code` (đánh giá lại tại thời điểm đặt bằng `evaluateVoucher`; không hợp lệ → `ApiError(422, reason, VOUCHER_INVALID_CODE)` và không lưu; hợp lệ → lưu `voucher_code` đã chuẩn hóa, `discount`, `total = subtotal + delivery_fee − discount`); đơn không mã: `discount: 0`, `voucher_code: null`; `toRawOrder` trả cả hai trường.
- Produces adapter (thô): `getStores({provinceId, q} = {})` (lọc `province_id`; `q` bằng `normalizeText(name).includes(normalizeText(q))`, `q` rỗng/chỉ khoảng trắng không lọc); `getOffers()` (các voucher `listed` còn hạn theo `now()`, dạng `{id, title, description, code, min_order, expires_at}` **không** có `type`/`value`/`max_discount`/`listed`); `validateVoucher({code, items})` (`items` rỗng hoặc món lạ → `ApiError(422)`; trả `{valid: true, code, title, discount}` hoặc `{valid: false, reason}`; `deliveryFee = MOCK_DELIVERY_FEE`).

- [ ] **Step 1: Write the failing tests** (`createMockAdapter(0, () => clock)`, món `tra-dao` size `m` không topping, số lượng 2 → tạm tính 102000; `localStorage.clear()` mỗi test)

```js
it('getStores: không lọc → 9; lọc hn → 3; q không dấu "cua hang mau 1" khớp; q chỉ khoảng trắng → đủ', ...);
it('getStores lọc hn + q hợp lệ chỉ trả cửa hàng thuộc hn', ...);
it('getOffers: 4 mã đang hiệu lực, không có HETHAN, không rò type/value/max_discount', async () => { const list = await adapter.getOffers(); expect(list.map(o => o.code).sort()).toEqual(['CHAO10', 'COMBO15', 'FREESHIP', 'GIAM20K']); expect(JSON.stringify(list)).not.toMatch(/type|value|max_discount|listed/); });
it('getOffers: đồng hồ sau hạn thì voucher hết hạn biến mất khỏi danh sách', ...);
it('validateVoucher CHAO10 với 102000 → { valid: true, code: "CHAO10", title: ..., discount: 10200 }', ...);
it('validateVoucher mã lạ / HETHAN / dưới đơn tối thiểu → { valid: false, reason } đúng lý do', ...);
it('validateVoucher items rỗng hoặc món lạ → ApiError 422', ...);
it('validateVoucher nhận mã chữ thường', ...);
it('createOrder có CHAO10: discount 10200, voucher_code "CHAO10", total = 102000 + 15000 − 10200 = 106800', ...);
it.each(['CHAO10', 'GIAM20K', 'FREESHIP'])('mức giảm xem trước bằng mức giảm trong đơn (%s)', async (code) => { const preview = await adapter.validateVoucher({ code, items }); const order = await adapter.createOrder(request({ voucher_code: code })); expect(order.discount).toBe(preview.discount); expect(order.total).toBe(order.subtotal + order.delivery_fee - order.discount); });   // Review Focus 4
it('createOrder không mã: discount 0, voucher_code null, total = subtotal + delivery_fee', ...);
it('createOrder với HETHAN → ApiError 422, code "voucher_invalid", message là lý do, và không lưu đơn', ...);   // Review Focus 1
it('createOrder với mã dưới đơn tối thiểu → 422 voucher_invalid', ...);
it('createOrder cùng client_request_id sau khi bị từ chối vì mã: đặt lại không mã tạo đơn bình thường', ...);
it('getOrder và getMyOrders trả discount/voucher_code của đơn', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/api/adapters/mockVouchers.test.js` → FAIL.
- [ ] **Step 3: Implement**; test mock đơn hàng/tài khoản cũ vẫn xanh.
- [ ] **Step 4: Run** `npx vitest run` → PASS toàn bộ.
- [ ] **Step 5: Commit** `feat: mock cửa hàng, ưu đãi, kiểm tra mã và đặt hàng có mã`

### Task 5: Http adapter, service và hook

**Files:**
- Modify: `src/api/adapters/httpAdapter.js`
- Create: `src/services/storeService.js`, `offerService.js`, `voucherService.js`, `src/hooks/useStores.js`, `useOffers.js`, `useApplyVoucher.js`
- Modify: `src/hooks/useCreateOrder.js`
- Test: `src/api/adapters/httpAdapter.test.js`, `src/services/storeService.test.js`, `offerService.test.js`, `voucherService.test.js`, `src/hooks/useStores.test.jsx`, `useApplyVoucher.test.jsx`

**Interfaces:**
- Consumes: mappers Task 2, `request`, `adapter` (`src/api`).
- Produces http adapter: `getStores({provinceId, q} = {})` → `GET /stores` với `params {province: provinceId, q}`; `getOffers()` → `GET /offers`; `validateVoucher(body)` → `POST /vouchers/validate`.
- Produces services: `getStores(filter: {provinceId?: string, q?: string} = {}): Promise<Store[]>`; `getOffers(): Promise<Offer[]>`; `validateVoucher({code, items}): Promise<VoucherResult>` (qua `toVoucherRequest`, kết quả qua `toVoucherResult`).
- Produces hooks: `useStores(filter)` (`useQuery`, khóa `['stores', filter]`); `useOffers()` (khóa `['offers']`); `useApplyVoucher()` (`useMutation`, `mutate({code, items})` → `validateVoucher`). `useCreateOrder` nhận thêm `voucherCode` trong biến mutation: `mutate({form, items, clientRequestId, voucherCode})` → `toOrderRequest({...})`.

- [ ] **Step 1: Write the failing tests**

```js
it('http getStores: GET /stores?province=hn&q=mau; bỏ tham số rỗng', ...);   it('http getOffers GET /offers', ...);
it('http validateVoucher POST /vouchers/validate với body JSON', ...);
it('storeService.getStores truyền filter cho adapter và map sang Store', ...);
it('storeService bỏ cửa hàng hỏng và warn', ...);   it('offerService.getOffers map sang Offer', ...);
it('voucherService.validateVoucher gửi toVoucherRequest (không giá, không note) và trả VoucherResult', ...);
it('voucherService: phản hồi lạ ({ valid: "yes" }) → ném lỗi', ...);
it('useStores truyền filter và trả dữ liệu', ...);   it('useApplyVoucher.mutate gọi service với code và items', ...);
it('useCreateOrder gửi voucher_code khi có voucherCode và bỏ khóa khi không có', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/api src/services src/hooks` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run` → PASS.
- [ ] **Step 5: Commit** `feat: http adapter, service và hook cửa hàng, ưu đãi, voucher`

### Task 6: Trang Cửa hàng

**Files:**
- Create: `src/features/stores/links.js`, `src/components/StoreCard.jsx`, `src/pages/StoresPage.jsx` (+ CSS Modules)
- Modify: `src/App.jsx` (route `stores`), `src/components/Header.jsx` (link "Cửa hàng")
- Test: `src/features/stores/links.test.js`, `src/components/StoreCard.test.jsx`, `src/pages/StoresPage.test.jsx`, `src/components/Header.test.jsx`

**Interfaces:**
- Consumes: `useStores`, `useProvinces`, `useDebouncedValue`, `normalizeText`.
- Produces `links.js`: `buildDirectionsUrl(store): string` = `https://www.google.com/maps/search/?api=1&query=` + `encodeURIComponent([name, street, wardName, provinceName].filter(Boolean).join(', '))`; `telHref(phone: string): string` = `` `tel:${phone.replace(/[^\d+]/g, '')}` ``.
- Produces `<StoreCard store />`: tên (`h2`), địa chỉ `street, wardName, provinceName`, `openingHours`, link số điện thoại (tên truy cập = số điện thoại, `href = telHref`), link `aria-label="Chỉ đường tới <tên>"` (chữ hiện "Chỉ đường") `href = buildDirectionsUrl`, `target="_blank"`, `rel="noopener noreferrer"`. Thiếu phone → không hiện link `tel:`.
- Produces `<StoresPage />`: `h1` "Cửa hàng"; ô chọn "Tỉnh/Thành" (tùy chọn đầu "Tất cả", giá trị `''`) và ô tìm "Tìm cửa hàng" (`type="search"`) đồng bộ `?province=` / `?q=` (ô tìm debounce `SEARCH_DEBOUNCE_MS`, giữ `?province=`); danh sách trong `<section aria-label="Danh sách cửa hàng" aria-busy>`; tải → `Skeleton`; lỗi → `ErrorState` + Thử lại; rỗng → `EmptyState` `NO_STORES_TEXT`. Header: link "Cửa hàng" → `/stores`.

- [ ] **Step 1: Write the failing tests**

```js
it('buildDirectionsUrl: tiền tố cố định và query đã mã hóa', () => expect(buildDirectionsUrl({ name: 'Cửa hàng Mẫu 1', street: '12 Phố Mẫu', wardName: 'Phường Mẫu 1', provinceName: 'Hà Nội' })).toBe(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Cửa hàng Mẫu 1, 12 Phố Mẫu, Phường Mẫu 1, Hà Nội')}`));
it('buildDirectionsUrl: ký tự nguy hiểm (", <, &, javascript:) nằm trọn trong query', () => { const url = buildDirectionsUrl({ name: '"><script>x</script>', street: 'a&b=c', wardName: 'javascript:alert(1)', provinceName: '#frag?x=1' }); expect(url.startsWith('https://www.google.com/maps/search/?api=1&query=')).toBe(true); expect(new URL(url).searchParams.get('query')).toBe('"><script>x</script>, a&b=c, javascript:alert(1), #frag?x=1'); expect(new URL(url).host).toBe('www.google.com'); });   // Review Focus 5
it('buildDirectionsUrl bỏ trường rỗng', ...);
it.each([['028 0000 0001', 'tel:02800000001'], ['+84 28 0000.0001', 'tel:+842800000001'], ['0280000000"><b>', 'tel:0280000000'], ['', 'tel:']])('telHref(%j) → %s', (input, expected) => expect(telHref(input)).toBe(expected));   // Review Focus 5
it('StoreCard: link Chỉ đường có đúng href, target _blank, rel noopener noreferrer', ...);
it('StoreCard: link tel dùng telHref; thiếu phone thì không có link tel', ...);
it('StoreCard hiện địa chỉ và giờ mở cửa nguyên văn', ...);
// StoresPage (mock adapter createMockAdapter(0))
it('hiện 9 cửa hàng', ...);   it('?province=hn chỉ hiện 3 cửa hàng của Hà Nội và ô chọn đang ở "Hà Nội"', ...);
it('chọn tỉnh đổi ?province= và lọc', ...);
it('gõ "cua hang mau 1" (không dấu) sau debounce đổi ?q= và giữ ?province=', ...);
it('không có kết quả → NO_STORES_TEXT', ...);   it('lỗi tải → ErrorState; Thử lại tải lại được', ...);
it('Header có link "Cửa hàng" → /stores', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/features/stores src/components/StoreCard.test.jsx src/pages/StoresPage.test.jsx src/components/Header.test.jsx` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run` → PASS.
- [ ] **Step 5: Commit** `feat: trang cửa hàng với lọc, tìm và chỉ đường`

### Task 7: Trang Ưu đãi

**Files:**
- Create: `src/lib/clipboard.js`, `src/components/OfferCard.jsx`, `src/pages/OffersPage.jsx` (+ CSS Modules)
- Modify: `src/App.jsx` (route `offers`), `src/components/Header.jsx` (link "Ưu đãi")
- Test: `src/lib/clipboard.test.js`, `src/components/OfferCard.test.jsx`, `src/pages/OffersPage.test.jsx`, `src/components/Header.test.jsx`

**Interfaces:**
- Consumes: `useOffers`, `formatVnd`.
- Produces `copyText(text: string): Promise<boolean>`: có `navigator.clipboard?.writeText` thì gọi và trả `true`; không có hoặc bị từ chối → `false` (không ném).
- Produces `<OfferCard offer />`: tiêu đề (`h2`), mô tả, mã (phần tử chọn được, `user-select: all`), "Đơn từ <formatVnd(minOrder)>" nếu `minOrder`, "Hạn dùng đến <`toLocaleDateString('vi-VN')`>" nếu `expiresAt`; nút `aria-label="Sao chép mã <code>"` (chữ hiện "Sao chép mã"); sau khi bấm hiện `role="status"` "Đã sao chép mã <code>" hoặc `COPY_FAILED_TEXT`.
- Produces `<OffersPage />`: `h1` "Ưu đãi"; danh sách thẻ; tải → `Skeleton`; lỗi → `ErrorState` + Thử lại; rỗng → `EmptyState` `NO_OFFERS_TEXT`. Header: link "Ưu đãi" → `/offers` (thứ tự nav: Trang chủ, Menu, Cửa hàng, Ưu đãi, Đơn hàng).

- [ ] **Step 1: Write the failing tests**

```js
it('copyText: có clipboard → gọi writeText với đúng chuỗi và trả true', async () => { const writeText = vi.fn().mockResolvedValue(); vi.stubGlobal('navigator', { clipboard: { writeText } }); expect(await copyText('CHAO10')).toBe(true); expect(writeText).toHaveBeenCalledWith('CHAO10'); });
it('copyText: không có clipboard → false', async () => { vi.stubGlobal('navigator', {}); expect(await copyText('X')).toBe(false); });
it('copyText: writeText bị từ chối → false, không ném', ...);
it('OfferCard hiện tiêu đề, mô tả, mã, điều kiện đơn từ và hạn dùng', ...);   it('OfferCard không có minOrder/expiresAt thì không hiện hai dòng đó', ...);
it('bấm Sao chép mã thành công → "Đã sao chép mã CHAO10" (role status)', ...);
it('bấm Sao chép mã khi clipboard không dùng được → COPY_FAILED_TEXT, mã vẫn còn trên trang', ...);
it('OffersPage hiện 4 ưu đãi của mock, không có HETHAN', ...);   it('rỗng → NO_OFFERS_TEXT', ...);   it('lỗi tải → ErrorState; Thử lại tải lại được', ...);
it('Header có link "Ưu đãi" → /offers và đúng thứ tự nav', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/lib/clipboard.test.js src/components/OfferCard.test.jsx src/pages/OffersPage.test.jsx src/components/Header.test.jsx` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run` → PASS.
- [ ] **Step 5: Commit** `feat: trang ưu đãi với nút sao chép mã`

### Task 8: `OrderSummary` có giảm giá và `VoucherBox`

**Files:**
- Create: `src/components/VoucherBox.jsx` (+ CSS Modules)
- Modify: `src/components/OrderSummary.jsx`
- Test: `src/components/VoucherBox.test.jsx`, `src/components/OrderSummary.test.jsx`

**Interfaces:**
- Consumes: `useApplyVoucher`, `normalizeVoucherCode`, `isVoucherCode`, `formatVnd`, `FormField`/`fieldProps`, messages Task 1.
- Sửa `<OrderSummary lines subtotal deliveryFee? discount? total? />`: thêm `discount?`; khi `discount > 0` hiện dòng "Giảm giá" với số tiền có dấu trừ (`−` + `formatVnd`); thứ tự các dòng: Tạm tính, Phí giao hàng, Giảm giá, Tổng cộng.
- Produces `<VoucherBox items applied cartChanged onApplied onRemove />`: `items: CartItem[]`; `applied: {code, title, discount} | null`; `cartChanged: boolean`; `onApplied(result: {valid: true, code, title, discount}): void`; `onRemove(): void`. Ô nhãn "Mã giảm giá" (`fieldProps('voucher', error)`) và nút "Áp dụng". Bấm: chuẩn hóa mã; không `isVoucherCode` → lỗi `VOUCHER_FORMAT_TEXT`, **không gọi API**; hợp lệ → `mutate({code, items})` (nút khóa khi đang chạy): `valid: true` → `onApplied(result)`, xóa ô nhập và lỗi; `valid: false` → lỗi `reason` (`role="alert"` dưới ô), **không** gọi `onApplied` và không đụng `applied`; lỗi mạng/máy chủ → lỗi `error.message`. Khi `applied` có giá trị: hiện "Đã áp dụng <code> — <title>" và nút "Bỏ mã" (gọi `onRemove`). `cartChanged` → hiện `role="status"` `VOUCHER_CART_CHANGED_TEXT`.

- [ ] **Step 1: Write the failing tests** (mock adapter `createMockAdapter(0)`; giỏ chứa `tra-dao` size `m` số lượng 2)

```js
it('OrderSummary: discount > 0 hiện dòng Giảm giá có dấu trừ và đúng thứ tự', () => { /* thứ tự: Tạm tính, Phí giao hàng, Giảm giá, Tổng cộng; text chứa "−" và 10.200 */ });
it('OrderSummary: discount 0 hoặc undefined không hiện dòng Giảm giá', ...);
it('VoucherBox: nhập " chao10 " và Áp dụng → onApplied nhận { valid: true, code: "CHAO10", discount: 10200, ... }', ...);
it('VoucherBox: mã sai định dạng "ab" → VOUCHER_FORMAT_TEXT và không gọi adapter.validateVoucher', ...);
it('VoucherBox: HETHAN → hiện "Mã giảm giá đã hết hạn", onApplied không được gọi', ...);
it('VoucherBox: dưới đơn tối thiểu → hiện lý do "Đơn hàng cần từ ..."', ...);
it('VoucherBox: đang có mã áp, áp mã sai → lý do hiện dưới ô, "Đã áp dụng <mã cũ>" và nút Bỏ mã vẫn còn, onRemove/onApplied không gọi', ...);   // Review Focus 3
it('VoucherBox: áp mã mới thành công thì onApplied nhận mã mới', ...);
it('VoucherBox: nút Áp dụng bị khóa khi đang kiểm tra, bấm hai lần chỉ gọi validateVoucher một lần', ...);
it('VoucherBox: lỗi máy chủ (adapter.validateVoucher bị từ chối 500) → hiện message lỗi, vẫn bấm lại được', ...);
it('VoucherBox: applied → hiện "Đã áp dụng CHAO10 — <tiêu đề>"; bấm Bỏ mã gọi onRemove', ...);
it('VoucherBox: cartChanged → hiện VOUCHER_CART_CHANGED_TEXT', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/components/VoucherBox.test.jsx src/components/OrderSummary.test.jsx` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run` → PASS.
- [ ] **Step 5: Commit** `feat: khung mã giảm giá và dòng giảm giá trong tóm tắt đơn`

### Task 9: Thanh toán có mã, theo dõi đơn và gợi ý ở giỏ hàng

**Files:**
- Modify: `src/pages/CheckoutPage.jsx`, `src/pages/OrderTrackingPage.jsx`, `src/pages/CartPage.jsx`
- Test: `src/pages/CheckoutPage.test.jsx`, `src/pages/OrderTrackingPage.test.jsx`, `src/pages/CartPage.test.jsx`

**Interfaces:**
- Consumes: `VoucherBox`, `OrderSummary` (có `discount?`), `useCreateOrder` (có `voucherCode`), `VOUCHER_INVALID_CODE`, `ApiError.code`.
- `CheckoutPage`: state `applied: {code, title, discount, signature} | null`; `signature = items.map(i => `${i.key}×${i.quantity}`).join('|')`; `activeVoucher = applied?.signature === signature ? applied : null`; `cartChanged = applied !== null && activeVoucher === null`. `VoucherBox` nằm trong cột tóm tắt (`applied={activeVoucher}`, `cartChanged`, `onApplied={(r) => setApplied({ code: r.code, title: r.title, discount: r.discount, signature })}`, `onRemove={() => setApplied(null)}`); `OrderSummary` nhận `discount={activeVoucher?.discount}`. Đặt hàng: `mutate({form, items, clientRequestId, voucherCode: activeVoucher?.code})`; `onError`: `error.code === VOUCHER_INVALID_CODE` → `setApplied(null)` và `requestIdRef.current = null` (lần bấm sau tạo `clientRequestId` mới); alert vẫn hiện `error.message`. Các lỗi khác giữ nguyên hành vi (giữ mã, giữ `clientRequestId`).
- `OrderTrackingPage`: `OrderSummary` nhận `discount={order.discount}`; danh sách chi tiết thêm "Mã giảm giá" = `order.voucherCode` khi có.
- `CartPage` (khi giỏ có món): dòng "Có mã giảm giá? Nhập ở bước thanh toán." kèm link "Xem ưu đãi" → `/offers`.

- [ ] **Step 1: Write the failing tests** (mock adapter; `CHAO10` với giỏ `tra-dao` size `m` ×2 = tạm tính 102000 → giảm 10200)

```js
it('Checkout: áp CHAO10 → hiện "Đã áp dụng CHAO10" và dòng Giảm giá −10.200 trong tóm tắt, vẫn không có Tổng cộng', ...);
it('Checkout: đặt hàng có mã gửi voucher_code "CHAO10"; đơn nằm trong getOrder với discount 10200 và total = 102000 + 15000 − 10200', ...);
it('Checkout: không áp mã thì request không có khóa voucher_code', ...);
it('Checkout: Bỏ mã rồi đặt → request không có voucher_code', ...);
it('Checkout: giỏ đổi sau khi áp mã (component Capture lấy useCart() và gọi setQuantity) → VOUCHER_CART_CHANGED_TEXT, không còn dòng giảm, request không có voucher_code', ...);   // Review Focus 2
it('Checkout: mã hết hạn đúng lúc đặt (áp CHAO10 xong, rồi vi.spyOn(adapter, "createOrder").mockRejectedValueOnce(new ApiError(422, "Mã giảm giá đã hết hạn", "voucher_invalid"))) → alert hiện đúng lý do đó, mã bị gỡ, giỏ và form còn nguyên', ...);   // Review Focus 1
it('Checkout: sau voucher_invalid bấm Đặt hàng lại → createOrder gọi lần hai với client_request_id KHÁC lần một, không có voucher_code, và đặt thành công', async () => { expect(spy.mock.calls[1][0].client_request_id).not.toBe(spy.mock.calls[0][0].client_request_id); expect('voucher_code' in spy.mock.calls[1][0]).toBe(false); });   // Review Focus 1
it('Checkout: lỗi khác (500) khi đặt có mã → giữ mã và giữ cùng client_request_id', ...);
it('Tracking: đơn có giảm giá hiện dòng Giảm giá và "Mã giảm giá: CHAO10"; đơn không giảm không hiện hai dòng đó', ...);
it('Cart: có món → hiện gợi ý mã giảm giá và link Xem ưu đãi → /offers; giỏ trống thì không hiện', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/pages` → FAIL.
- [ ] **Step 3: Implement**; test giai đoạn 1–3 cho trang này vẫn xanh.
- [ ] **Step 4: Run** `npx vitest run` → PASS toàn bộ.
- [ ] **Step 5: Commit** `feat: thanh toán có mã giảm giá, xử lý mã hết hạn khi đặt, hiển thị giảm giá ở đơn`

### Task 10: Tài liệu và kiểm tra cuối

**Files:**
- Modify: `README.md`
- Test: toàn bộ

**Interfaces:** không có.

- [ ] **Step 1: Cập nhật `README.md`:** thêm `/stores`, `/offers` vào bảng route; mục "Cửa hàng và ưu đãi" (cửa hàng chỉ xem, "Chỉ đường" là link Google Maps dựng từ địa chỉ, mã giảm giá chỉ áp ở trang Thanh toán và không lưu khi tải lại, mức giảm do backend tính); hợp đồng API giả định của giai đoạn 4 (chép từ spec mục 7) kèm quy ước lỗi `{message, code}` và `voucher_invalid`; cập nhật mục "Chưa có" (còn chọn cửa hàng khi đặt, bản đồ nhúng, kho voucher tài khoản, cổng thanh toán thật, xác minh email...).
- [ ] **Step 2: Run** `npm test` → mọi test PASS; `npm run build` → thành công, không cảnh báo mới; `VITE_API_MODE=http VITE_API_BASE_URL=https://api.example.com/v1 npm run build` → thành công.
- [ ] **Step 3: Quét an toàn:** đọc từng dòng của `grep -rnE "console\.(log|warn|error)" src --include=*.js --include=*.jsx | grep -v "\.test\."` (không dòng nào in mã giảm giá, số điện thoại, token, mật khẩu hay nội dung phản hồi lỗi); `grep -rnE "href=\{[^}]*(store|offer)\.(url|link|mapUrl)" src` không có kết quả (không dùng URL của backend); `grep -rn "localStorage" src | grep -v "\.test\."` chỉ nằm ở các module lưu trữ cũ (không có voucher).
- [ ] **Step 4: Kiểm tra thủ công** bằng `npm run dev` ở 1280px và 1024px: `/stores` (lọc, tìm, "Chỉ đường" mở tab mới), `/offers` (sao chép mã), thêm món → `/cart` (thấy gợi ý) → `/checkout`: áp `CHAO10` rồi `HETHAN` (mã cũ còn), bỏ mã, áp `FREESHIP` → đặt hàng → `/orders/:id` thấy dòng Giảm giá và Mã giảm giá. Ghi kết quả từng bước; chỗ nào chưa chạy thật (không có trình duyệt) thì nói rõ là chưa chạy.
- [ ] **Step 5: Commit** `docs: README và kiểm tra giai đoạn 4`
