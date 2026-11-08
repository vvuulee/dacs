import { VOUCHER_DESCRIPTION_MAX, VOUCHER_TITLE_MAX } from '../../constants';
import { isFinalStatus } from '../../features/orders/orderStatus';
import { getStaffToken } from '../../features/staff/session';
import { isVoucherCode, normalizeVoucherCode } from '../../features/vouchers/normalizeCode';
import { setAvailability, withAvailability } from '../../mocks/availabilityStore';
import {
  buildCounterOrder, computeOrderStatus, isToday, loadStoredOrders, saveStoredOrders, toRawOrder, transitionOrder,
} from '../../mocks/orderStore';
import { products } from '../../mocks/products';
import { createStaffStore } from '../../mocks/staffStore';
import { loadVouchers, saveVouchers } from '../../mocks/voucherStore';
import { ApiError, notifyStaffUnauthorized } from '../client';

const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const TOKENLESS = new Set(['staffLogin']);
const VOUCHER_TYPES = ['percent', 'fixed', 'freeship'];
const PERCENT_MAX = 100;
const ORDER_NOT_FOUND = 'Không tìm thấy đơn';

const invalid = (message) => new ApiError(422, message);
const newestFirst = (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at);

// Mô phỏng client.js với auth:'staff': request có token mà bị 401/403 thì báo cho StaffAuthContext.
function reportStaffUnauthorized(methods) {
  const wrap = ([name, method]) => {
    if (TOKENLESS.has(name)) return [name, method];
    return [name, async (...args) => {
      const hadToken = getStaffToken() !== null;
      try {
        return await method(...args);
      } catch (error) {
        if ((error.status === UNAUTHORIZED || error.status === FORBIDDEN) && hadToken) notifyStaffUnauthorized();
        throw error;
      }
    }];
  };
  return Object.fromEntries(Object.entries(methods).map(wrap));
}

// Quy tắc voucher của backend (spec mục 5). Trả bản ghi đã chuẩn hoá, sai thì ném 422.
function buildVoucher(body, now) {
  const code = normalizeVoucherCode(body.code);
  if (!isVoucherCode(code)) throw invalid('Mã giảm giá không hợp lệ');
  const title = String(body.title ?? '').trim();
  if (!title || title.length > VOUCHER_TITLE_MAX) throw invalid(`Tiêu đề từ 1 đến ${VOUCHER_TITLE_MAX} ký tự`);
  const description = String(body.description ?? '').trim();
  if (description.length > VOUCHER_DESCRIPTION_MAX) throw invalid(`Mô tả tối đa ${VOUCHER_DESCRIPTION_MAX} ký tự`);
  const { type, value } = body;
  if (!VOUCHER_TYPES.includes(type)) throw invalid(`Loại voucher không hợp lệ: ${type}`);
  const validValue = {
    percent: Number.isInteger(value) && value >= 1 && value <= PERCENT_MAX,
    fixed: Number.isInteger(value) && value > 0,
    freeship: value === 0,
  }[type];
  if (!validValue) throw invalid('Giá trị giảm không hợp lệ');
  const maxDiscount = body.max_discount ?? null;
  if (maxDiscount !== null && (type !== 'percent' || !Number.isInteger(maxDiscount) || maxDiscount <= 0)) {
    throw invalid('Mức giảm tối đa không hợp lệ');
  }
  if (!Number.isInteger(body.min_order) || body.min_order < 0) throw invalid('Đơn tối thiểu không hợp lệ');
  const expires = Date.parse(body.expires_at);
  if (!Number.isFinite(expires) || expires <= now) throw invalid('Hạn dùng phải ở tương lai');
  return {
    code, title, description, type, value, max_discount: maxDiscount, min_order: body.min_order,
    expires_at: new Date(expires).toISOString(), listed: body.listed === true,
  };
}

function emptyReport(now) {
  const d = new Date(now);
  const pad = (n) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    order_count: 0, revenue: 0, cancelled_count: 0,
    by_source: { counter: { count: 0, revenue: 0 }, online: { count: 0, revenue: 0 } },
    by_payment: { cash: 0, bank_transfer: 0, wallet: 0 },
  };
}

export function createStaffMethods({ now, wait }) {
  const staffStore = createStaffStore(now);
  const requireStaff = () => staffStore.requireStaff(getStaffToken());
  const todayOrders = () => loadStoredOrders().filter((o) => isToday(o.created_at, now()));

  const methods = {
    async staffLogin(body) {
      await wait();
      return staffStore.login(body);
    },
    async staffLogout() {
      const token = getStaffToken(); // đọc trước khi chờ: client có thể xóa phiên ngay sau khi gọi
      await wait();
      staffStore.logout(token);
    },
    async staffGetMe() {
      await wait();
      return { ...requireStaff() };
    },
    async staffChangePassword(body) {
      await wait();
      staffStore.changePassword(getStaffToken(), body);
    },

    async staffCreateOrder(request) {
      await wait();
      const staff = requireStaff();
      const orders = loadStoredOrders();
      const existing = orders.find((o) => o.client_request_id === request.client_request_id);
      if (existing) return toRawOrder(existing, now());
      const order = buildCounterOrder(request, now(), staff.id);
      saveStoredOrders([...orders, order]);
      return toRawOrder(order, now());
    },
    async staffGetOnlineOrders({ status } = {}) {
      await wait();
      requireStaff();
      // Đơn hôm nay, cộng đơn ngày trước chưa xong (để không bị kẹt sau nửa đêm).
      return loadStoredOrders()
        .filter((o) => o.source !== 'counter')
        .map((o) => toRawOrder(o, now()))
        .filter((o) => isToday(o.created_at, now()) || !isFinalStatus(o.status))
        .filter((o) => o.status !== 'awaiting_payment' && (!status || o.status === status))
        .sort(newestFirst);
    },
    async staffUpdateOrderStatus(id, status) {
      await wait();
      requireStaff();
      const orders = loadStoredOrders();
      const index = orders.findIndex((o) => o.id === id);
      if (index === -1) throw new ApiError(404, ORDER_NOT_FOUND);
      const updated = transitionOrder(orders[index], status, now());
      saveStoredOrders(orders.map((o, i) => (i === index ? updated : o)));
      return toRawOrder(updated, now());
    },
    async staffGetTodayOrders() {
      await wait();
      requireStaff();
      return todayOrders().map((o) => toRawOrder(o, now())).sort(newestFirst);
    },
    // Doanh thu: đơn hôm nay trừ đơn huỷ và đơn chờ thanh toán.
    async staffGetTodayReport() {
      await wait();
      requireStaff();
      const report = emptyReport(now());
      for (const order of todayOrders()) {
        const { status } = computeOrderStatus(order, now());
        if (status === 'cancelled') report.cancelled_count += 1;
        if (status === 'cancelled' || status === 'awaiting_payment') continue;
        const source = order.source === 'counter' ? 'counter' : 'online';
        report.order_count += 1;
        report.revenue += order.total;
        report.by_source[source].count += 1;
        report.by_source[source].revenue += order.total;
        report.by_payment[order.payment_method] += order.total;
      }
      return report;
    },

    async staffGetVouchers() {
      await wait();
      requireStaff();
      return loadVouchers();
    },
    async staffCreateVoucher(body) {
      await wait();
      requireStaff();
      const voucher = buildVoucher(body ?? {}, now());
      const list = loadVouchers();
      if (list.some((v) => v.code === voucher.code)) throw new ApiError(409, 'Mã đã tồn tại');
      const created = { id: `v-${voucher.code}-${now()}`, ...voucher };
      saveVouchers([...list, created]);
      return created;
    },
    async staffDeleteVoucher(id) {
      await wait();
      requireStaff();
      const list = loadVouchers();
      if (!list.some((v) => v.id === id)) throw new ApiError(404, 'Không tìm thấy voucher');
      saveVouchers(list.filter((v) => v.id !== id));
      return null;
    },

    async staffGetProducts() {
      await wait();
      requireStaff();
      return products.map(withAvailability);
    },
    async staffSetAvailability(id, isAvailable) {
      await wait();
      requireStaff();
      const product = products.find((p) => p.id === id);
      if (!product) throw new ApiError(404, `Không tìm thấy món: ${id}`);
      if (typeof isAvailable !== 'boolean') throw invalid('is_available phải là true/false');
      setAvailability(id, isAvailable);
      return withAvailability(product);
    },
  };
  return reportStaffUnauthorized(methods);
}
