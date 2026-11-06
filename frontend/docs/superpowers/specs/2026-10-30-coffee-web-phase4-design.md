# Thiết kế giai đoạn 4: Cửa hàng (chỉ xem) và Ưu đãi / voucher

Ngày: 2026-10-30 · Trạng thái: chờ duyệt · Dựa trên: spec giai đoạn 1, 2, 3 cùng thư mục

## 1. Mục tiêu và bối cảnh

Hoàn thiện web đặt đồ uống desktop (React + Vite, JavaScript) với hai phần còn lại của kế hoạch 4 giai đoạn:

- **Cửa hàng:** trang danh sách cửa hàng để xem, lọc theo Tỉnh/Thành, tìm theo tên, kèm link "Chỉ đường" mở bản đồ bên ngoài. **Không ảnh hưởng việc đặt hàng.**
- **Ưu đãi:** trang liệt kê khuyến mãi công khai (có nút sao chép mã) và ô nhập mã giảm giá ở trang Thanh toán. Backend kiểm tra mã và trả mức giảm; đơn đặt đi kèm mã.

Mục đích vẫn là **chuẩn bị nối backend thật** do người khác làm, hình dạng chưa biết. Tiêu chí thành công:

> Đổi sang API thật chỉ cần sửa adapter/mapper (và `client.js` cho phần đọc lỗi); không sửa component giao diện. Giá, phí giao và mức giảm do **backend tính**; frontend chỉ hiển thị.

## 2. Phạm vi

**Trong phạm vi:** trang `/stores`, trang `/offers`, khung mã giảm giá ở `/checkout`, dòng "Giảm giá" trong tóm tắt đơn và trang theo dõi đơn, gợi ý ở giỏ hàng, hai link mới ở Header, mock backend cho cửa hàng/ưu đãi/voucher, đọc `message`/`code` từ phản hồi lỗi trong `client.js`.

**Ngoài phạm vi:** chọn cửa hàng khi đặt hàng, bản đồ nhúng, sắp xếp cửa hàng theo khoảng cách, "đang mở/đã đóng" (cần múi giờ), kho voucher riêng của tài khoản, áp mã ở trang giỏ hàng, nhớ mã đã áp khi tải lại trang, API báo giá đầy đủ (`/orders/quote`), phân trang danh sách cửa hàng.

## 3. Giả định và quyết định đã chốt

- Hợp đồng API ở mục 7 chỉ là **giả định để người làm backend đối chiếu**.
- Dữ liệu mock là **dữ liệu mẫu hư cấu** (tên "Cửa hàng Mẫu 1…", địa chỉ và số điện thoại giả); không dùng tên, địa chỉ hay logo thật của The Coffee House.
- Xem trước mức giảm bằng một API kiểm tra mã riêng (hướng A); nếu sau này cần báo giá đầy đủ có thể nâng cấp lên `/orders/quote` mà không làm lại giao diện.
- Giao diện bám phong cách giai đoạn 1–3 (tiếng Việt, cam `#fb8d17`, desktop từ 1024px).

## 4. Luồng và route

| Route | Nội dung |
|---|---|
| `/stores` | Danh sách cửa hàng. Lọc `?province=<id tỉnh>` và tìm `?q=<từ khóa>` trên URL (giống Menu). |
| `/offers` | Danh sách khuyến mãi công khai. |

**Header:** nav thành "Trang chủ", "Menu", "Cửa hàng", "Ưu đãi", "Đơn hàng".

### Cửa hàng

- Bộ lọc: ô chọn "Tỉnh/Thành" (tùy chọn đầu "Tất cả", dữ liệu từ `useProvinces()`) và ô "Tìm cửa hàng" (debounce `SEARCH_DEBOUNCE_MS`, cập nhật `?q=`, giữ `?province=`). Tìm không phân biệt hoa thường và dấu (như Menu).
- Thẻ cửa hàng: tên; địa chỉ `street, wardName, provinceName`; giờ mở cửa (chuỗi `openingHours` backend trả, hiển thị nguyên văn); số điện thoại là link `tel:` (chỉ giữ chữ số và dấu `+`); link **"Chỉ đường"** mở tab mới (`target="_blank"`, `rel="noopener noreferrer"`) tới `https://www.google.com/maps/search/?api=1&query=<tên, đường, phường, tỉnh đã mã hóa>`. URL bản đồ **luôn do frontend tự dựng** từ địa chỉ; không bao giờ dùng URL hay link do backend trả về.
- Trạng thái: đang tải (khung chờ), lỗi (`ErrorState` + Thử lại), rỗng ("Không tìm thấy cửa hàng nào").

### Ưu đãi

- Thẻ ưu đãi: tiêu đề, mô tả, mã (chọn được bằng tay), điều kiện "Đơn từ <số tiền>" nếu có `minOrder`, "Hạn dùng đến <ngày>" nếu có `expiresAt` (`toLocaleDateString('vi-VN')`), nút **"Sao chép mã"**.
- Sao chép: dùng `navigator.clipboard.writeText`; thành công hiện `role="status"` "Đã sao chép mã <mã>"; không có Clipboard API hoặc bị từ chối (ví dụ trang http không bảo mật) hiện `role="status"` "Không sao chép được, hãy chọn và sao chép mã".
- Backend chỉ trả ưu đãi còn hiệu lực; frontend không tự lọc theo hạn dùng. Trạng thái: đang tải, lỗi, rỗng ("Hiện chưa có ưu đãi nào").

### Mã giảm giá ở trang Thanh toán

- Khung "Mã giảm giá" nằm ở cột tóm tắt đơn: ô nhập + nút "Áp dụng".
- Chuẩn hóa trước khi gửi: bỏ mọi khoảng trắng, đổi chữ hoa; phải khớp `^[A-Z0-9-]{3,32}$`, sai thì báo "Mã giảm giá không hợp lệ" và **không gọi API**.
- Hợp lệ → gọi `POST /vouchers/validate` (món + mã, **không gửi giá**). Nút "Áp dụng" bị khóa khi đang kiểm tra. Kết quả: `valid: true` → trạng thái **đã áp dụng**: hiện "Đã áp dụng <mã> — <tiêu đề>", nút "Bỏ mã", và dòng **"Giảm giá −<số tiền>"** trong tóm tắt (trang Thanh toán vẫn không hiện "Tổng cộng" vì phí giao chỉ có sau khi đặt, như giai đoạn 2). `valid: false` → hiện `reason` ở `role="alert"` dưới ô nhập.
- Trạng thái "đã áp dụng" chỉ nằm trong trang Thanh toán (không lưu; tải lại trang thì phải áp lại). Nó gắn với **chữ ký giỏ hàng** (`key×số lượng` của từng dòng); nếu giỏ đổi sau khi áp mã, mã bị coi là không còn hiệu lực: hiện "Giỏ hàng đã thay đổi, hãy áp lại mã", không hiện dòng giảm và **không** gửi `voucher_code` khi đặt.
- Giỏ hàng (`/cart`): thêm dòng "Có mã giảm giá? Nhập ở bước thanh toán." kèm link "Xem ưu đãi" → `/offers`.

### Đặt hàng có mã

- Request đặt hàng thêm `voucher_code` (đã chuẩn hóa) **chỉ khi** đang có mã hợp lệ; không có thì bỏ hẳn trường này.
- Đơn trả về có `discount` và `voucherCode`; `OrderSummary` hiện dòng "Giảm giá" (số tiền có dấu trừ) khi `discount > 0`, theo thứ tự Tạm tính, Phí giao hàng, Giảm giá, Tổng cộng; trang theo dõi đơn hiện thêm "Mã giảm giá: <mã>".
- Nếu backend từ chối vì mã không còn hợp lệ lúc đặt (lỗi có `code === 'voucher_invalid'`): hiện lý do thật ở `role="alert"`, **gỡ mã đã áp**, **giữ giỏ và form**, và **tạo `clientRequestId` mới** (nội dung request đã đổi; một backend chặt chẽ có thể nhớ khóa của lần bị từ chối và trả lại đúng kết quả lỗi cũ). Khách bấm "Đặt hàng" lần nữa thì đặt không có mã. Các lỗi khác giữ hành vi cũ (giữ nguyên mã và `clientRequestId`).

## 5. Kiến trúc

Giữ luồng: `component → hook → service → adapter (mock | http) → mapper → model`.

```
src/
  mappers/           store.js, offer.js, voucher.js
  services/          storeService.js, offerService.js, voucherService.js
  hooks/             useStores.js, useOffers.js, useApplyVoucher.js
  features/vouchers/ normalizeCode.js
  mocks/             stores.js, offers.js (bảng voucher), voucherEngine.js
  components/        StoreCard, OfferCard, VoucherBox
  pages/             StoresPage, OffersPage
```

**Sửa phần có sẵn:** `api/client.js` (đọc lỗi), `api/adapters/mockAdapter.js` và `httpAdapter.js`, `mocks/orderStore.js` (xuất hàm tính giá món dùng chung; `createOrder` xử lý mã), `mappers/order.js` (`discount`, `voucherCode`, `voucher_code`, tách hàm `toRequestItem` dùng chung với `voucher.js`), `components/OrderSummary.jsx`, `pages/CheckoutPage.jsx`, `pages/OrderTrackingPage.jsx`, `pages/CartPage.jsx`, `components/Header.jsx`, `App.jsx`, `README.md`.

### Đọc lỗi trong `client.js`

Hiện `ApiError` chỉ có thông điệp chung ("Máy chủ trả lỗi 422"). Hợp đồng giả định mới: phản hồi lỗi có thể mang JSON `{ message?: string, code?: string }`. `request` đọc nó (bọc `try/catch`; thân không phải JSON hoặc không có `json()` thì bỏ qua): `ApiError(status, message, code)` với `message` là chuỗi không rỗng của backend (cắt tối đa `ERROR_MESSAGE_MAX = 300` ký tự) hoặc thông điệp chung nếu không có, và `error.code` là chuỗi hoặc `undefined`. `message` là thông điệp backend viết sẵn để hiển thị cho người dùng; React tự thoát ký tự nên không có nguy cơ chèn mã. Hành vi 401/204/202 giữ nguyên.

## 6. Model nội bộ

```
Store { id, name, street, wardName, provinceId, provinceName, phone, openingHours }
Offer { id, title, description, code, minOrder, expiresAt }          // minOrder, expiresAt: null nếu không có
VoucherResult = { valid: true, code, title, discount } | { valid: false, reason }
Order  (thêm)  { discount, voucherCode }                             // discount: số nguyên ≥ 0 (mặc định 0); voucherCode: null nếu không có
```

- Mapper danh sách (`toStores`, `toOffers`) **bỏ phần tử hỏng** kèm `console.warn` (như `toProducts`); phần tử hợp lệ cần `id` và `name`/`title`; `Offer` cần thêm `code`.
- `toVoucherResult(raw)`: `valid === true` cần `code`, `title` và `discount` là số nguyên ≥ 0 (thiếu → ném lỗi nêu trường); `valid === false` lấy `reason` (thiếu → "Mã giảm giá không dùng được"); các giá trị khác của `valid` → ném lỗi.
- `toOrder`: `discount = raw.discount ?? 0` (phải là số nguyên ≥ 0, sai → ném lỗi nêu `discount`), `voucherCode = raw.voucher_code ?? null`.
- `toOrderRequest({form, items, clientRequestId, voucherCode})`: thêm `voucher_code` **chỉ khi** `voucherCode` có giá trị.
- `normalizeVoucherCode(input): string` (bỏ mọi khoảng trắng, chữ hoa) và `isVoucherCode(code): boolean` (`^[A-Z0-9-]{3,32}$`, hằng số `VOUCHER_CODE_MIN = 3`, `VOUCHER_CODE_MAX = 32`).
- Tiền vẫn là số nguyên VND, `formatVnd`.

## 7. Hợp đồng API giả định (REST)

Chỉ để đối chiếu; mapper và adapter hấp thụ khác biệt.

```
GET  /stores?province=&q=   → [{ id, name, province_id, province_name, ward_name, street, phone, opening_hours }]
GET  /offers                → [{ id, title, description, code, min_order, expires_at }]    (chỉ ưu đãi còn hiệu lực)
POST /vouchers/validate     { code, items:[{ product_id, size_id, topping_ids, quantity }] }
                            → 200 { valid: true, code, title, discount }
                            | 200 { valid: false, reason }          (lý do nghiệp vụ luôn là 200, không dùng mã lỗi)
POST /orders                (thêm trường tùy chọn voucher_code)
                            → đơn trả về thêm  discount, voucher_code
                            | 422 { message, code: "voucher_invalid" }   khi mã không còn hợp lệ lúc đặt
```

- `opening_hours`, `min_order` (số nguyên VND hoặc `null`) và `expires_at` (ISO 8601 hoặc `null`) như đã nêu ở mục 6; request kiểm tra mã **không gửi giá** và không gửi ghi chú.
- `total = subtotal + delivery_fee − discount` do backend tính và trả về; frontend không tự cộng trừ.

## 8. Mock backend

Hằng số trong `constants.js`: `VOUCHER_CODE_MIN = 3`, `VOUCHER_CODE_MAX = 32`, `ERROR_MESSAGE_MAX = 300`, `VOUCHER_INVALID_CODE = 'voucher_invalid'`.

- **Cửa hàng** (`mocks/stores.js`): 9 cửa hàng mẫu, 3 cửa hàng cho mỗi tỉnh/thành `hn`, `hcm`, `dn` (đúng `province_id`/`province_name` của `mocks/addresses.js`), số điện thoại hư cấu, giờ mở cửa dạng "07:00 – 22:00". `getStores({provinceId, q})` lọc theo tỉnh và theo tên không dấu (`normalizeText`); `q` chỉ khoảng trắng → không lọc.
- **Voucher** (`mocks/offers.js`): bảng `{ id, title, description, code, type: 'percent' | 'fixed' | 'freeship', value, max_discount, min_order, expires_at, listed }`:

| Mã | Loại | Điều kiện | Ghi chú |
|---|---|---|---|
| `CHAO10` | giảm 10%, tối đa 30.000 | đơn từ 50.000 | liệt kê |
| `GIAM20K` | giảm cố định 20.000 | đơn từ 100.000 | liệt kê |
| `FREESHIP` | miễn phí giao hàng | đơn từ 80.000 | liệt kê |
| `COMBO15` | giảm 15%, tối đa 50.000 | đơn từ 150.000 | liệt kê |
| `HETHAN` | giảm 50% | — | `expires_at` trong quá khứ, **không** liệt kê |

  `getOffers()` trả các mã `listed` còn hạn, **không** kèm `type`/`value`.
- **`voucherEngine.js`:** `evaluateVoucher(code, subtotal, deliveryFee, now)` → `{ ok: true, voucher, discount }` hoặc `{ ok: false, reason }`. Mã không có trong bảng → "Mã giảm giá không tồn tại"; `Date.parse(expires_at) <= now` → "Mã giảm giá đã hết hạn"; `subtotal < min_order` → "Đơn hàng cần từ <formatVnd(min_order)> để dùng mã này". Mức giảm: phần trăm = `floor(subtotal × value / 100)` cắt ở `max_discount`; cố định = `min(value, subtotal)`; freeship = `deliveryFee`. Mã so khớp không phân biệt hoa thường.
- **`validateVoucher(body)`:** `items` rỗng hoặc món/size/topping lạ → `ApiError(422)`; tính `subtotal` bằng đúng hàm tính giá của `createOrder` (xuất từ `orderStore.js`), `deliveryFee = MOCK_DELIVERY_FEE`; trả `{ valid: true, code, title, discount }` hoặc `{ valid: false, reason }`.
- **`createOrder` có `voucher_code`:** đánh giá lại tại thời điểm đặt; không hợp lệ → `ApiError(422, reason, 'voucher_invalid')` và **không lưu đơn**; hợp lệ → lưu `voucher_code` (đã chuẩn hóa) và `discount`, `total = subtotal + deliveryFee − discount`. Đơn không có mã: `discount = 0`, `voucher_code = null`. Cùng `client_request_id` vẫn trả lại đơn cũ.

## 9. Kiểm tra form và xử lý lỗi

- Ô mã: chuẩn hóa + `isVoucherCode` trước khi gọi API; lỗi mạng hoặc lỗi máy chủ khi kiểm tra hiện thông điệp của lỗi ở `role="alert"` (không gỡ mã đang áp); lý do `valid: false` chỉ hiện dưới ô nhập, **mã đang áp (nếu có) vẫn giữ nguyên** để một lần gõ nhầm không làm mất mức giảm; mã cũ chỉ bị thay khi mã mới được áp thành công.
- Hai lần áp liên tiếp: nút khóa khi đang kiểm tra nên không chạy đua.
- Lỗi tải danh sách cửa hàng/ưu đãi: `ErrorState` kèm Thử lại; không có dữ liệu → trạng thái rỗng.
- Không lưu mã đã áp ở `localStorage`; không ghi mã giảm giá hay số điện thoại ra log.

## 10. Kiểm thử

- **Unit:** mapper cửa hàng, ưu đãi, kết quả kiểm tra mã (thiếu trường, giá trị `valid` lạ, bỏ phần tử hỏng + warn); `normalizeVoucherCode`/`isVoucherCode` (bảng); `evaluateVoucher` (từng loại; trần phần trăm; giảm cố định không vượt tạm tính; freeship = phí giao; đúng biên `min_order` ± 1; hết hạn đúng mốc; mã chữ thường); mock `validate` và `createOrder` cho **cùng** mức giảm, `total = tạm tính + phí giao − giảm`, 422 `voucher_invalid` và không lưu đơn; `toOrder` (`discount` mặc định 0, âm → lỗi), `toOrderRequest` (`voucher_code` chỉ khi có); `client.js` đọc lỗi (có `message`/`code`, không phải JSON, thiếu `message`, `message` quá dài bị cắt, phản hồi không có `json()`); http adapter (đường dẫn, tham số `province`/`q`, thân request kiểm tra mã).
- **Component:** `/stores` (lọc theo `?province=`, tìm không dấu giữ `?province=`, rỗng, lỗi + Thử lại, link "Chỉ đường" đúng URL và `target`/`rel`, `tel:` đã làm sạch); `/offers` (danh sách, sao chép thành công và thất bại, rỗng, lỗi); khung mã ở Thanh toán (áp thành công hiện dòng giảm và nút "Bỏ mã"; lý do hết hạn/chưa đủ đơn tối thiểu; mã sai định dạng không gọi API; giỏ đổi thì mã mất hiệu lực và không gửi `voucher_code`; đặt hàng gửi `voucher_code`; mã hết hạn lúc đặt → hiện lý do, gỡ mã, giữ giỏ/form, dùng `clientRequestId` mới và đặt lại được); trang theo dõi đơn hiện "Giảm giá" và "Mã giảm giá"; giỏ hàng có gợi ý; Header có hai link mới.

## 11. Tiêu chí hoàn thành

- `npm test` và `npm run build` chạy sạch, không cảnh báo mới (cả `VITE_API_MODE=http`).
- Luồng xem cửa hàng (lọc, tìm, chỉ đường), xem ưu đãi và sao chép mã, áp mã ở thanh toán, đặt hàng có giảm giá rồi thấy dòng giảm ở trang theo dõi chạy với dữ liệu mẫu.
- Đặt hàng với mã vừa hết hạn không làm mất giỏ hay form và đặt lại được.
- Đổi `VITE_API_MODE=http` chỉ cần cung cấp URL và chỉnh mapper/adapter/`client.js`; không sửa component.

## 12. Rủi ro còn lại

- Bản xem trước và đơn thật có thể lệch nếu backend tính khác; số trong đơn là số cuối cùng.
- Mã giới hạn lượt dùng, dùng một lần hay theo từng người là việc của backend; hợp đồng giả định chưa có chỗ cho voucher riêng của tài khoản.
- Danh sách cửa hàng chưa phân trang và chưa sắp theo khoảng cách; nếu có hàng trăm cửa hàng cần phân trang và lọc phía backend.
- "Chỉ đường" phụ thuộc Google Maps (chỉ là link, không nhúng).
- Thông điệp lỗi do backend viết được hiển thị nguyên văn (cắt 300 ký tự); backend cần đảm bảo đó là chữ dành cho người dùng, không chứa thông tin nội bộ.
- Giao diện vẫn chưa được xem bằng mắt trong trình duyệt (như giai đoạn 1–3).
