# Coffee Web Giai đoạn 1 (Nền tảng + Duyệt món) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web đặt đồ uống desktop (React) gồm Trang chủ, Menu, Chi tiết món, Giỏ hàng, chạy bằng dữ liệu mẫu và đổi sang API thật chỉ bằng adapter/mapper.

**Architecture:** Luồng một chiều `Component → hook (TanStack Query) → service → adapter (mock | http) → mapper → model nội bộ`. Giỏ hàng dùng `useReducer` + Context + `localStorage`.

**Tech Stack:** Vite, React, React Router, TanStack Query, CSS Modules, Vitest + Testing Library (jsdom). JavaScript thuần, không TypeScript.

**Spec:** `docs/superpowers/specs/2026-10-30-coffee-web-phase1-design.md`

## Global Constraints

- Giao diện tiếng Việt; chủ đạo cam `#fb8d17`, nền trắng kem, chữ nâu đậm; mọi màu và khoảng cách nằm trong `src/styles/tokens.css`.
- Hỗ trợ từ khoảng 1024px trở lên; không làm bản điện thoại/máy tính bảng.
- Tiền là số nguyên VND, hiển thị bằng `Intl.NumberFormat('vi-VN')`.
- Số lượng mỗi dòng giỏ: 1–99. Ghi chú tối đa 200 ký tự. Debounce tìm kiếm 300ms.
- `localStorage` giỏ hàng dạng `{version, items}`; dữ liệu hỏng hoặc sai phiên bản → giỏ trống, không crash.
- Không dùng logo, ảnh hay tên thương hiệu của The Coffee House; tên thương hiệu chỉ ở `src/config/brand.js`.
- Biến môi trường: `VITE_API_MODE=mock|http`, `VITE_API_BASE_URL`.
- Chỉ dùng dependency: `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`; dev: `vite`, `@vitejs/plugin-react`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`.
- Code theo skill `coding-hieu-qua`: không magic number (hằng số ở `src/constants.js`), early return, không nuốt lỗi, một hàm một việc. Task giao diện đọc skill `frontend-design`: focus bàn phím nhìn thấy được, tôn trọng `prefers-reduced-motion`.
- Ngoài phạm vi: thanh toán, theo dõi đơn, đăng nhập, cửa hàng, ưu đãi.

## Review Focus

1. Một món hỏng trong danh sách: các món còn lại vẫn hiển thị, có `console.warn` ghi rõ lý do (Task 3).
2. `localStorage` ném lỗi khi ghi (đầy, bị chặn) hoặc chứa JSON hỏng: app vẫn chạy, giỏ trống (Task 6).
3. Tìm kiếm chỉ có khoảng trắng hoặc ký tự đặc biệt như `(`: coi như văn bản thường, khoảng trắng = không lọc, không crash (Tasks 2, 4).
4. Cùng món, cùng topping khác thứ tự chọn, ghi chú khác khoảng trắng đầu/cuối: gộp thành một dòng giỏ (Task 6).
5. Mở `/menu/khong-ton-tai` trực tiếp: Menu vẫn hiện phía sau, modal báo món không tồn tại kèm link về Menu (Task 10).

---

### Task 1: Khung dự án, hằng số, env, tokens

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `.gitignore` (có `node_modules`, `dist`), `.env.example`
- Create: `src/main.jsx`, `src/constants.js`, `src/types.js` (JSDoc typedef), `src/config/env.js`, `src/config/brand.js`, `src/styles/tokens.css`, `src/test/setup.js`
- Test: `src/config/env.test.js`

**Interfaces:**
- Produces `src/constants.js`: `MIN_QTY=1`, `MAX_QTY=99`, `NOTE_MAX_LENGTH=200`, `SEARCH_DEBOUNCE_MS=300`, `MOCK_LATENCY_MS=300`, `FEATURED_COUNT=8`, `CART_STORAGE_KEY='coffee-web:cart'`, `CART_STORAGE_VERSION=1`.
- Produces `src/types.js` typedef: `Category`, `Size {id,label,extraPrice}`, `Topping {id,name,price}`, `Product`, `CartItem` đúng như spec mục 5.
- Produces `src/config/env.js`: `readEnv(raw: Record<string,string|undefined>): {apiMode: 'mock'|'http', apiBaseUrl: string}` và `env = readEnv(import.meta.env)`.
- Produces `src/config/brand.js`: `BRAND = { name: 'Cà Phê Mẫu', tagline: string }`.

- [ ] **Step 1: Write the failing test** (`src/config/env.test.js`)

```js
it('mặc định là mock', () => expect(readEnv({}).apiMode).toBe('mock'));
it('nhận http kèm base url', () => expect(readEnv({VITE_API_MODE:'http',VITE_API_BASE_URL:'https://api.x/v1'})).toEqual({apiMode:'http',apiBaseUrl:'https://api.x/v1'}));
it('mode lạ ném lỗi nêu giá trị', () => expect(() => readEnv({VITE_API_MODE:'foo'})).toThrow(/foo/));
it('http thiếu base url ném lỗi', () => expect(() => readEnv({VITE_API_MODE:'http'})).toThrow(/VITE_API_BASE_URL/));
```

- [ ] **Step 2: Run** `npx vitest run src/config/env.test.js` → FAIL (`readEnv` chưa có).
- [ ] **Step 3: Tạo khung dự án** (package.json với script `dev`, `build`, `test`=`vitest run`; cấu hình vitest `environment: 'jsdom'`, `setupFiles: src/test/setup.js` import `@testing-library/jest-dom/vitest`; cài dependency ở Global Constraints) và implement `readEnv`. `tokens.css` khai báo biến màu (`--color-primary: #fb8d17`, nền kem, chữ nâu), cỡ chữ, khoảng cách, bo góc; chọn font hỗ trợ tiếng Việt.
- [ ] **Step 4: Run** `npx vitest run src/config/env.test.js` → PASS; `npm run build` → thành công.
- [ ] **Step 5: Commit** `git add -A && git commit -m "chore: khung dự án Vite + React, hằng số, env, tokens"`

### Task 2: lib thuần (money, text, price)

**Files:**
- Create: `src/lib/money.js`, `src/lib/text.js`, `src/lib/price.js`
- Test: `src/lib/money.test.js`, `src/lib/text.test.js`, `src/lib/price.test.js`

**Interfaces:**
- Consumes: typedef `Product` (`src/types.js`).
- Produces: `formatVnd(amount: number): string`; `normalizeText(value: string | null | undefined): string`; `calcUnitPrice(product: Product, sizeId: string | null, toppingIds: string[]): number`.

- [ ] **Step 1: Write the failing tests**

```js
// money
it('định dạng VND', () => expect(formatVnd(45000).replace(/\s/g,' ')).toBe('45.000 ₫'));
it('0 hợp lệ', () => expect(formatVnd(0)).toBeTruthy());
it.each([-1, 1.5, NaN])('%s ném RangeError', v => expect(() => formatVnd(v)).toThrow(RangeError));
// text
it('bỏ dấu, hạ chữ thường, đ→d', () => expect(normalizeText('Cà Phê Sữa Đá')).toBe('ca phe sua da'));
it('rỗng/null/undefined → ""', () => { expect(normalizeText('')).toBe(''); expect(normalizeText(null)).toBe(''); expect(normalizeText(undefined)).toBe(''); });
it('chỉ khoảng trắng → ""', () => expect(normalizeText('   ')).toBe(''));
it('gộp khoảng trắng, giữ ký tự đặc biệt', () => expect(normalizeText(' a  (b) ')).toBe('a (b)'));
// price (product: basePrice 45000, size M extra 6000, topping trân châu 8000 và thạch 5000)
it('cộng size và topping', () => expect(calcUnitPrice(p,'m',['tc','th'])).toBe(64000));
it('topping không tồn tại bị bỏ qua', () => expect(calcUnitPrice(p,'m',['zzz'])).toBe(51000));
it('topping trùng chỉ tính một lần', () => expect(calcUnitPrice(p,'m',['tc','tc'])).toBe(59000));
it('size không tồn tại ném lỗi nêu sizeId', () => expect(() => calcUnitPrice(p,'xl',[])).toThrow(/xl/));
it('món không có size, sizeId null → basePrice', () => expect(calcUnitPrice({...p,sizes:[]},null,[])).toBe(45000));
it('món có size nhưng sizeId null ném lỗi', () => expect(() => calcUnitPrice(p,null,[])).toThrow());
```

- [ ] **Step 2: Run** `npx vitest run src/lib` → FAIL.
- [ ] **Step 3: Implement** ba hàm đúng chữ ký. `formatVnd` dùng `Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'})`. `normalizeText` dùng `normalize('NFD')`, bỏ dấu kết hợp, thay `đ→d`.
- [ ] **Step 4: Run** `npx vitest run src/lib` → PASS.
- [ ] **Step 5: Commit** `git commit -am "feat: lib money, text, price"` (nhớ `git add` file mới).

### Task 3: Mapper

**Files:**
- Create: `src/mappers/product.js`, `src/mappers/category.js`
- Test: `src/mappers/product.test.js`, `src/mappers/category.test.js`

**Interfaces:**
- Produces: `toProduct(raw: object): Product` (ném `Error` nêu trường lỗi nếu thiếu `id`/`name` hoặc `base_price` không phải số hữu hạn ≥ 0; mặc định `description=''`, `image=''`, `sizes=[]`, `toppings=[]`, `isAvailable=true`; `id` luôn thành chuỗi); `toProducts(list: object[]): Product[]`; `toCategory(raw): Category`; `toCategories(list): Category[]`. Hai hàm số nhiều **bỏ qua** phần tử lỗi và gọi `console.warn` kèm id và lý do.
- Raw theo hợp đồng giả định spec mục 7 (snake_case).

- [ ] **Step 1: Write the failing tests**

```js
it('map snake_case → camelCase', () => expect(toProduct(raw)).toMatchObject({id:'1',categoryId:'c1',basePrice:45000,isAvailable:true}));
it('trường thiếu dùng mặc định', () => expect(toProduct({id:1,name:'A',base_price:1000})).toMatchObject({description:'',image:'',sizes:[],toppings:[]}));
it('thiếu name ném lỗi nêu "name"', () => expect(() => toProduct({id:'1',base_price:1})).toThrow(/name/));
it.each([null,-5,'abc'])('base_price %s ném lỗi', v => expect(() => toProduct({id:'1',name:'A',base_price:v})).toThrow(/base_price/));
it('toProducts bỏ món hỏng, giữ món tốt, có warn', () => { const warn = vi.spyOn(console,'warn').mockImplementation(()=>{}); expect(toProducts([good,{id:'x'}])).toHaveLength(1); expect(warn).toHaveBeenCalledOnce(); });
it('toProducts nhận mảng rỗng', () => expect(toProducts([])).toEqual([]));
// category: tương tự (thiếu id/name ném lỗi; toCategories bỏ phần tử hỏng và warn)
```

- [ ] **Step 2: Run** `npx vitest run src/mappers` → FAIL.
- [ ] **Step 3: Implement** theo Interfaces; nếu `sizes`/`toppings` thô không phải mảng thì dùng `[]`; giá `extra_price`/`price` không hợp lệ → ném lỗi (món bị bỏ ở `toProducts`).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: mapper product và category`

### Task 4: Lớp API (client, mock, http, service)

**Files:**
- Create: `src/api/client.js`, `src/api/adapters/mockAdapter.js`, `src/api/adapters/httpAdapter.js`, `src/api/index.js`, `src/mocks/categories.js`, `src/mocks/products.js`, `src/services/categoryService.js`, `src/services/productService.js`
- Test: `src/api/client.test.js`, `src/api/adapters/mockAdapter.test.js`, `src/services/productService.test.js`

**Interfaces:**
- Consumes: `normalizeText`, `MOCK_LATENCY_MS`, `env`, mappers Task 3.
- Produces `client.js`: `class ApiError extends Error { status: number }`; `request(path: string, opts?: {baseUrl: string, params?: Record<string,string>, signal?: AbortSignal}): Promise<any>`. Lỗi mạng → `ApiError(0, 'Không kết nối được tới máy chủ')`; HTTP không ok → `ApiError(status, ...)`; body không phải JSON → `ApiError(status, 'Phản hồi không hợp lệ')`.
- Produces adapter (cùng hình dạng cho mock và http, trả **dữ liệu thô** snake_case): `getCategories(): Promise<object[]>`, `getProducts({categoryId?: string, q?: string}): Promise<object[]>`, `getProduct(id: string): Promise<object>` (không có → `ApiError(404, ...)`).
- Produces `src/api/index.js`: `adapter` chọn theo `env.apiMode`.
- Produces services: `getCategories(): Promise<Category[]>`, `getProducts(filter: {categoryId?, q?}): Promise<Product[]>`, `getProduct(id: string): Promise<Product>`.
- Dữ liệu mẫu: 6 danh mục, 24 món snake_case, có size và topping; ít nhất 1 món `is_available:false`, 1 món không có size, 1 món không có topping; `image: ''` (component tự vẽ hình giữ chỗ).

- [ ] **Step 1: Write the failing tests**

```js
// client (mock global.fetch)
it('trả JSON khi ok', ...);              it('404 → ApiError status 404', ...);
it('fetch ném lỗi → ApiError status 0', ...);   it('body không phải JSON → ApiError', ...);
it('gắn params vào query string', ...);
// mockAdapter (vi.useFakeTimers hoặc MOCK_LATENCY_MS nhỏ)
it('lọc theo categoryId', ...);          it('tìm không dấu: q="ca phe" khớp "Cà phê"', ...);
it('q chỉ khoảng trắng → trả đủ danh sách', ...);   it('q="(" → [] và không ném lỗi', ...);
it('getProduct id lạ → ApiError 404', ...);
// productService (vi.mock('../api'))
it('map dữ liệu thô sang Product camelCase', ...);   it('getProduct truyền ApiError 404 lên trên', ...);
```

(Viết đầy đủ assertion cụ thể theo tên test; giá trị lấy từ `src/mocks`.)

- [ ] **Step 2: Run** `npx vitest run src/api src/services` → FAIL.
- [ ] **Step 3: Implement.** `httpAdapter` chỉ gọi `request('/categories')`, `request('/products', {params:{category,q}})`, `request('/products/'+encodeURIComponent(id))` với `baseUrl: env.apiBaseUrl`; không chuyển đổi dữ liệu (mapper làm việc đó). `mockAdapter` chờ `MOCK_LATENCY_MS` rồi lọc phía client.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: lớp API, adapter mock/http, service và dữ liệu mẫu`

### Task 5: Hooks truy vấn

**Files:**
- Create: `src/hooks/useCategories.js`, `src/hooks/useProducts.js`, `src/hooks/useProduct.js`, `src/hooks/useDebouncedValue.js`, `src/api/queryClient.js`
- Test: `src/hooks/useDebouncedValue.test.js`, `src/hooks/useProducts.test.jsx`

**Interfaces:**
- Consumes: services Task 4, `SEARCH_DEBOUNCE_MS`.
- Produces: `useCategories()`, `useProducts(filter: {categoryId?, q?})`, `useProduct(id: string)` đều trả kết quả `useQuery` (`data, isPending, isError, error, refetch`). `createQueryClient(): QueryClient` với `retry` tắt khi `error.status === 404`, tối đa 1 lần thử lại với lỗi khác. `useDebouncedValue<T>(value: T, ms: number = SEARCH_DEBOUNCE_MS): T`.

- [ ] **Step 1: Write the failing tests**

```js
it('debounce: giá trị chỉ đổi sau ms', () => { /* fake timers: rerender 'a'→'ab', tiến 299ms vẫn 'a', 300ms thành 'ab' */ });
it('useProducts trả data đã map', async () => { /* mock service, render với QueryClientProvider, waitFor data[0].categoryId */ });
it('useProduct không thử lại khi 404', async () => { /* service ném ApiError(404); expect gọi đúng 1 lần */ });
```

- [ ] **Step 2: Run** `npx vitest run src/hooks` → FAIL.
- [ ] **Step 3: Implement** hook với query key `['categories']`, `['products', filter]`, `['product', id]`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: hooks truy vấn và debounce`

### Task 6: Logic giỏ hàng

**Files:**
- Create: `src/features/cart/cartReducer.js`, `storage.js`, `selectors.js`, `CartContext.jsx`
- Test: `src/features/cart/cartReducer.test.js`, `storage.test.js`, `CartContext.test.jsx`

**Interfaces:**
- Consumes: `MIN_QTY`, `MAX_QTY`, `CART_STORAGE_KEY`, `CART_STORAGE_VERSION`, typedef `CartItem`.
- Produces: `makeCartKey({productId, sizeId, toppingIds, note}): string` = `productId|sizeId|toppingIds sắp xếp, loại trùng, nối ,|note trim`.
- Produces: `cartReducer(items: CartItem[], action): CartItem[]` với action `{type:'ADD', item: Omit<CartItem,'key'>}` (gộp nếu trùng key, cộng số lượng, kẹp ≤ `MAX_QTY`), `{type:'SET_QTY', key, quantity}` (≤0 xóa dòng, >99 kẹp 99), `{type:'REMOVE', key}`, `{type:'CLEAR'}`. Không đột biến state cũ.
- Produces: `loadCart(): CartItem[]`, `saveCart(items: CartItem[]): void` (không ném lỗi; lỗi chỉ `console.warn`); `selectCount(items): number`, `selectSubtotal(items): number`; `CartProvider({children})`, `useCart(): {items, add(item), setQuantity(key, qty), remove(key), clear()}` (ném lỗi rõ nếu dùng ngoài Provider).

- [ ] **Step 1: Write the failing tests**

```js
it('key không phụ thuộc thứ tự topping và khoảng trắng ghi chú', () => expect(makeCartKey({productId:'1',sizeId:'m',toppingIds:['b','a'],note:' ít đá '})).toBe(makeCartKey({productId:'1',sizeId:'m',toppingIds:['a','b'],note:'ít đá'})));
it('ADD cùng key gộp dòng', () => expect(next).toHaveLength(1) && expect(next[0].quantity).toBe(3));
it('ADD vượt 99 kẹp ở 99', ...);   it('SET_QTY 0 xóa dòng', ...);   it('SET_QTY 150 kẹp 99', ...);
it('REMOVE và CLEAR', ...);        it('reducer không đột biến state cũ', ...);
// storage
it('save rồi load trả lại giống hệt', ...);
it('JSON hỏng → [] và warn', ...);   it('sai version → []', ...);
it('item có quantity 0 hoặc unitPrice âm → [] ', ...);
it('setItem ném QuotaExceededError → saveCart không ném', ...);
// selectors
it('selectSubtotal = Σ unitPrice × quantity', ...);   it('giỏ rỗng → 0', ...);
// CartContext
it('thêm món → count cập nhật và localStorage được ghi', ...);
it('useCart ngoài Provider ném lỗi', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/features/cart` → FAIL.
- [ ] **Step 3: Implement.** `CartProvider` khởi tạo state bằng `useReducer(cartReducer, undefined, loadCart)`; `useEffect` gọi `saveCart` khi `items` đổi.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: logic giỏ hàng (reducer, storage, context)`

### Task 7: App shell và thành phần dùng chung

**Files:**
- Create: `src/App.jsx`, `src/components/Header.jsx`, `Footer.jsx`, `Skeleton.jsx`, `ErrorState.jsx`, `EmptyState.jsx`, `ProductImage.jsx`, `RouteErrorBoundary.jsx`, `src/pages/NotFoundPage.jsx` (kèm CSS Modules)
- Modify: `src/main.jsx` (bọc `QueryClientProvider`, `CartProvider`, `BrowserRouter`)
- Test: `src/components/Header.test.jsx`, `src/components/ErrorState.test.jsx`, `src/App.test.jsx`

**Interfaces:**
- Consumes: `useCart`, `selectCount`, `useDebouncedValue`, `BRAND`.
- Produces: `<ErrorState message: string, onRetry?: () => void />`; `<EmptyState title: string, hint?: string />`; `<Skeleton height?: string, width?: string />`; `<ProductImage src: string, name: string />` (không có `src` → khối màu + chữ cái đầu của `name`); `<Header />` (logo, điều hướng Trang chủ/Menu, `SearchBox` cập nhật `?q=` sau 300ms và giữ `?category=`, nút địa chỉ giữ chỗ, biểu tượng giỏ + số lượng → `/cart`); `<RouteErrorBoundary>`.
- Routes: `/` HomePage, `/menu` MenuPage (con `:id` = modal, Task 10), `/cart` CartPage, `*` NotFoundPage. Trang trong Task 8–11 thay phần giữ chỗ tạm.

- [ ] **Step 1: Write the failing tests**

```js
it('Header hiện số lượng giỏ', () => expect(screen.getByLabelText(/giỏ hàng/i)).toHaveTextContent('3'));
it('gõ vào ô tìm: URL đổi ?q= sau 300ms, giữ category', () => { /* fake timers */ });
it('ErrorState hiện thông điệp và gọi onRetry khi bấm "Thử lại"', ...);
it('ProductImage không src hiện chữ cái đầu', ...);
it('route lạ hiện NotFoundPage với link về trang chủ', ...);
it('lỗi ném trong trang được RouteErrorBoundary bắt và hiện ErrorState', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/components src/App.test.jsx` → FAIL.
- [ ] **Step 3: Implement.** Layout: `Header` cố định trên cùng, nội dung giữa, `Footer` dưới.
- [ ] **Step 4: Run** → PASS; `npm run dev` chạy được, xem bằng mắt khung chung ở ≥1024px.
- [ ] **Step 5: Commit** `feat: app shell, header, footer, trạng thái dùng chung`

### Task 8: Trang chủ

**Files:**
- Create: `src/pages/HomePage.jsx` (+ CSS Modules)
- Test: `src/pages/HomePage.test.jsx`

**Interfaces:**
- Consumes: `useCategories`, `useProducts({})`, `FEATURED_COUNT`, `ProductImage`, `formatVnd`, `ErrorState`, `Skeleton`.
- Produces: `<HomePage />`: banner chính (chỉ CSS, không ảnh ngoài), lưới danh mục mỗi mục link `/menu?category=<id>`, "Món bán chạy" = `FEATURED_COUNT` món đầu có `isAvailable`, mỗi thẻ link `/menu/<id>`.

- [ ] **Step 1: Write the failing tests**

```js
it('hiện danh mục có link /menu?category=', ...);
it('Món bán chạy tối đa FEATURED_COUNT và bỏ món hết hàng', ...);
it('đang tải hiện Skeleton; lỗi hiện ErrorState và thử lại gọi refetch', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/pages/HomePage.test.jsx` → FAIL.
- [ ] **Step 3: Implement.** Hero mở bằng nội dung đặc trưng của đồ uống, không dùng hero số liệu + gradient mặc định.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: trang chủ`

### Task 9: Trang Menu và ProductCard

**Files:**
- Create: `src/pages/MenuPage.jsx`, `src/components/ProductCard.jsx`, `src/components/CategoryList.jsx` (+ CSS Modules)
- Test: `src/pages/MenuPage.test.jsx`

**Interfaces:**
- Consumes: `useCategories`, `useProducts`, `useSearchParams`, `ErrorState`, `EmptyState`, `Skeleton`.
- Produces: `<MenuPage />` đọc `?category=` và `?q=`, bố cục 3 cột (danh mục | lưới món | cột giỏ, Task 11); render `<Outlet />` cho modal. `<ProductCard product: Product />` link `/menu/<id>` giữ nguyên query string; món hết hàng hiện "Tạm hết". `<CategoryList categories: Category[], activeId: string | null />`.

- [ ] **Step 1: Write the failing tests**

```js
it('chọn danh mục đổi ?category= và lọc lưới', ...);
it('?q=ca phe chỉ hiện món khớp (không dấu)', ...);
it('không có kết quả hiện EmptyState', ...);
it('?q=%20%20 (khoảng trắng) hiện đủ món', ...);
it('món isAvailable=false hiện "Tạm hết"', ...);
it('lỗi tải hiện ErrorState; bấm Thử lại gọi refetch', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/pages/MenuPage.test.jsx` → FAIL.
- [ ] **Step 3: Implement.** Từ 1024–1199px cột giỏ ẩn, thay bằng nút mở ngăn kéo (qua media query + state `drawerOpen`).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: trang menu, thẻ món, danh mục`

### Task 10: Modal chi tiết món

**Files:**
- Create: `src/components/ProductModal.jsx` (+ CSS Modules)
- Modify: `src/App.jsx` (route con `:id` của `/menu` render `ProductModal`)
- Test: `src/components/ProductModal.test.jsx`

**Interfaces:**
- Consumes: `useProduct`, `calcUnitPrice`, `formatVnd`, `useCart().add`, `MIN_QTY`, `MAX_QTY`, `NOTE_MAX_LENGTH`.
- Produces: `<ProductModal />` đọc `:id` từ route; `div role="dialog" aria-modal`, đóng bằng Esc, nút đóng, hoặc bấm nền → điều hướng về `/menu` giữ query string. Mặc định: size đầu tiên, không topping, số lượng 1, ghi chú rỗng. Nút "Thêm vào giỏ" hiện tổng tiền `calcUnitPrice × quantity`; bấm xong gọi `add({productId,name,image,sizeId,toppingIds,note,quantity,unitPrice})` rồi đóng. Món hết hàng: nút vô hiệu, nhãn "Tạm hết".

- [ ] **Step 1: Write the failing tests**

```js
it('mặc định chọn size đầu và hiện tổng đúng', ...);
it('chọn size L và 2 topping: tổng cập nhật', ...);
it('tăng số lượng tới 99 thì nút + bị vô hiệu; không xuống dưới 1', ...);
it('ghi chú dài hơn 200 ký tự bị chặn', ...);
it('Thêm vào giỏ: giỏ có dòng đúng size/topping/ghi chú và modal đóng', ...);
it('món hết hàng: nút vô hiệu', ...);
it('Esc đóng modal và giữ ?category=', ...);
it('/menu/khong-ton-tai: Menu vẫn hiện, modal báo "không tồn tại" kèm link về /menu', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/components/ProductModal.test.jsx` → FAIL.
- [ ] **Step 3: Implement.** Không dùng `<dialog>.showModal()` (jsdom không hỗ trợ ổn định); tự đưa focus vào modal khi mở và trả focus về thẻ món khi đóng.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: modal chi tiết món`

### Task 11: Giỏ hàng (CartPanel, CartPage, trang giữ chỗ thanh toán)

**Files:**
- Create: `src/components/CartPanel.jsx`, `src/components/CartLine.jsx`, `src/pages/CartPage.jsx`, `src/pages/CheckoutPlaceholderPage.jsx` (+ CSS Modules)
- Modify: `src/pages/MenuPage.jsx` (gắn `CartPanel` vào cột phải/ngăn kéo), `src/App.jsx` (route `/cart`, `/checkout`)
- Test: `src/pages/CartPage.test.jsx`, `src/components/CartPanel.test.jsx`

**Interfaces:**
- Consumes: `useCart`, `selectSubtotal`, `formatVnd`, `ProductImage`, `EmptyState`, `MIN_QTY`, `MAX_QTY`.
- Produces: `<CartLine item: CartItem />` (tên, size, topping, ghi chú, tăng/giảm số lượng, xóa); `<CartPanel />` (bản thu gọn + tạm tính + link "Xem giỏ hàng"); `<CartPage />` (đầy đủ + tạm tính + link "Thanh toán" tới `/checkout`); giỏ trống hiện `EmptyState` kèm link về Menu. `/checkout` chỉ hiện thông báo tính năng thuộc giai đoạn 2.

- [ ] **Step 1: Write the failing tests**

```js
it('giỏ trống hiện EmptyState và link về /menu', ...);
it('tăng/giảm số lượng cập nhật tạm tính', ...);
it('giảm tại 1 xóa dòng', ...);   it('nút xóa bỏ dòng', ...);
it('tạm tính = Σ unitPrice × quantity định dạng VND', ...);
it('tải lại trang (mount mới) vẫn còn giỏ từ localStorage', ...);
it('link Thanh toán trỏ tới /checkout', ...);
```

- [ ] **Step 2: Run** `npx vitest run src/pages/CartPage.test.jsx src/components/CartPanel.test.jsx` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: giỏ hàng, panel và trang giữ chỗ thanh toán`

### Task 12: Hoàn thiện và kiểm tra cuối

**Files:**
- Create: `README.md`
- Test: toàn bộ

**Interfaces:** không có.

- [ ] **Step 1: Viết `README.md`:** cách cài (`npm install`), chạy (`npm run dev`), test (`npm test`), build (`npm run build`), cách đổi sang API thật (`VITE_API_MODE=http`, `VITE_API_BASE_URL`, chỉnh `src/mappers/`), và hợp đồng API giả định (chép từ spec mục 7).
- [ ] **Step 2: Run** `npm test` → mọi test PASS; `npm run build` → thành công, không cảnh báo mới.
- [ ] **Step 3: Kiểm tra thủ công** bằng `npm run dev` ở 1280px và 1024px: Trang chủ → Menu (lọc, tìm "ca phe") → mở món → thêm vào giỏ → cột giỏ/ngăn kéo cập nhật → `/cart` → tải lại trang vẫn còn giỏ. Mở `/menu/khong-ton-tai`. Ghi kết quả từng bước; chỗ nào chưa chạy thật thì nói rõ là chưa chạy.
- [ ] **Step 4: Commit** `docs: README và kiểm tra giai đoạn 1`
