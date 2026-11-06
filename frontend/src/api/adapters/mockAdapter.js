import { MOCK_DELIVERY_FEE, MOCK_LATENCY_MS, MY_ORDERS_MAX } from '../../constants';
import { normalizeText } from '../../lib/text';
import { provinces, wardsByProvince } from '../../mocks/addresses';
import { vouchers } from '../../mocks/offers';
import { stores } from '../../mocks/stores';
import { evaluateVoucher } from '../../mocks/voucherEngine';
import { categories } from '../../mocks/categories';
import { products } from '../../mocks/products';
import { getToken } from '../../features/auth/session';
import { createAuthStore } from '../../mocks/authStore';
import { isOnlinePayment } from '../../features/orders/orderStatus';
import { normalizePhone } from '../../lib/phone';
import { buildStoredOrder, computeOrderStatus, priceItems, loadStoredOrders, saveStoredOrders, toRawOrder } from '../../mocks/orderStore';
import { ApiError, notifyUnauthorized } from '../client';

// Sai mã hay sai SĐT đều trả đúng một thông báo, để không dò được mã đơn tồn tại.
const ORDER_NOT_FOUND = 'Không tìm thấy đơn';

// Các hàm không gắn token (giống auth:false ở http adapter) thì 401 không phải "hết phiên".
const TOKENLESS_METHODS = new Set(['register', 'login', 'forgotPassword', 'resetPassword', 'peekResetToken']);

// Mô phỏng client.js: request có token mà bị 401 thì báo cho AuthContext (phiên hết hạn).
function reportUnauthorized(methods) {
  const wrap = ([name, method]) => {
    if (typeof method !== 'function' || TOKENLESS_METHODS.has(name)) return [name, method];
    return [name, async (...args) => {
      const hadToken = getToken() !== null;
      try {
        return await method(...args);
      } catch (error) {
        if (error.status === 401 && hadToken) notifyUnauthorized();
        throw error;
      }
    }];
  };
  return Object.fromEntries(Object.entries(methods).map(wrap));
}

export function createMockAdapter(latencyMs = MOCK_LATENCY_MS, now = () => Date.now()) {
  const auth = createAuthStore(now);
  // Chủ đơn = token hợp lệ và khớp user_id. Token sai/hết hạn bị bỏ qua (coi là khách) để
  // không làm hỏng việc tra đơn bằng SĐT; luồng 401 đã có ở createOrder, getMe, getMyOrders.
  const isOwner = (order) => {
    const token = getToken();
    if (!token || !order.user_id) return false;
    try {
      return auth.requireUser(token).id === order.user_id;
    } catch {
      return false;
    }
  };
  const wait = () => new Promise((resolve) => setTimeout(resolve, latencyMs));

  const methods = {
    async getCategories() {
      await wait();
      return categories;
    },
    async getProducts({ categoryId, q } = {}) {
      await wait();
      const needle = normalizeText(q);
      return products.filter(
        (p) => (!categoryId || p.category_id === categoryId) && normalizeText(p.name).includes(needle),
      );
    },
    async getStores({ provinceId, q } = {}) {
      await wait();
      const needle = normalizeText(q);
      return stores.filter((s) => (!provinceId || s.province_id === provinceId) && normalizeText(s.name).includes(needle));
    },
    // Chỉ ưu đãi công khai còn hạn, và không lộ chi tiết nội bộ (type/value/max_discount).
    async getOffers() {
      await wait();
      return vouchers
        .filter((v) => v.listed && Date.parse(v.expires_at) > now())
        .map(({ id, title, description, code, min_order: minOrder, expires_at: expiresAt }) => (
          { id, title, description, code, min_order: minOrder, expires_at: expiresAt }));
    },
    async validateVoucher({ code, items }) {
      await wait();
      if (!items?.length) throw new ApiError(422, 'Đơn hàng không có món nào');
      const { subtotal } = priceItems(items);
      const result = evaluateVoucher(code, subtotal, MOCK_DELIVERY_FEE, now());
      if (!result.ok) return { valid: false, reason: result.reason };
      return { valid: true, code: result.voucher.code, title: result.voucher.title, discount: result.discount };
    },
    async getProvinces() {
      await wait();
      return provinces;
    },
    async getWards(provinceId) {
      await wait();
      const wards = wardsByProvince[provinceId];
      if (!wards) throw new ApiError(404, `Không tìm thấy tỉnh/thành: ${provinceId}`);
      return wards;
    },
    async register(body) {
      await wait();
      return auth.register(body);
    },
    async login(body) {
      await wait();
      return auth.login(body);
    },
    async logout() {
      const token = getToken(); // đọc trước khi chờ: client có thể xóa phiên ngay sau khi gọi
      await wait();
      auth.logout(token);
    },
    async getMe() {
      await wait();
      return auth.toRawUser(auth.requireUser(getToken()));
    },
    async updateMe(body) {
      await wait();
      return auth.updateProfile(getToken(), body);
    },
    async changePassword(body) {
      await wait();
      auth.changePassword(getToken(), body);
    },
    async forgotPassword(body) {
      await wait();
      auth.forgotPassword(body);
    },
    async resetPassword(body) {
      await wait();
      auth.resetPassword(body);
    },
    // Chỉ mock: thay cho email thật để trang quên mật khẩu hiện "hộp thư giả lập".
    async peekResetToken(email) {
      await wait();
      return auth.peekResetToken(email);
    },
    async createOrder(request) {
      await wait();
      // Có token thì phải hợp lệ (sai/hết hạn → 401); không token → đơn khách vãng lai.
      const token = getToken();
      const user = token ? auth.requireUser(token) : null;
      const orders = loadStoredOrders();
      const existing = orders.find((o) => o.client_request_id === request.client_request_id);
      if (existing) return toRawOrder(existing, now());
      const order = buildStoredOrder(request, now(), user?.id ?? null);
      saveStoredOrders([...orders, order]);
      return toRawOrder(order, now());
    },
    async getOrder(id, phone) {
      await wait();
      const order = loadStoredOrders().find((o) => o.id === id);
      if (!order) throw new ApiError(404, ORDER_NOT_FOUND);
      if (!isOwner(order) && (!phone || normalizePhone(order.customer.phone) !== normalizePhone(phone))) {
        throw new ApiError(404, ORDER_NOT_FOUND);
      }
      return toRawOrder(order, now());
    },
    async getMyOrders() {
      await wait();
      const user = auth.requireUser(getToken());
      return loadStoredOrders()
        .map((order, index) => ({ order, index }))
        .filter(({ order }) => order.user_id === user.id)
        .sort((a, b) => Date.parse(b.order.created_at) - Date.parse(a.order.created_at) || b.index - a.index)
        .slice(0, MY_ORDERS_MAX)
        .map(({ order }) => toRawOrder(order, now()));
    },
    async simulatePayment(id) {
      await wait();
      const orders = loadStoredOrders();
      const order = orders.find((o) => o.id === id);
      if (!order) throw new ApiError(404, ORDER_NOT_FOUND);
      if (!isOnlinePayment(order.payment_method)) throw new ApiError(409, 'Đơn này không cần thanh toán online');
      if (!order.paid_at) {
        if (computeOrderStatus(order, now()).status !== 'awaiting_payment') {
          throw new ApiError(409, 'Đơn đã hết hạn thanh toán');
        }
        order.paid_at = new Date(now()).toISOString();
        saveStoredOrders(orders);
      }
      return toRawOrder(order, now());
    },
    async getProduct(id) {
      await wait();
      const found = products.find((p) => p.id === id);
      if (!found) throw new ApiError(404, `Không tìm thấy món: ${id}`);
      return found;
    },
  };
  return reportUnauthorized(methods);
}

export const mockAdapter = createMockAdapter();
