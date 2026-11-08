import { MOCK_ORDERS_KEY } from '../constants';
import { computeOrderStatus, loadStoredOrders, newOrderId, transitionOrder } from './orderStore';

const t0 = 1_000_000;
const iso = (ms) => new Date(ms).toISOString();
const cash = { id: 'CF1', payment_method: 'cash', created_at: iso(t0), paid_at: null };
const online = { ...cash, payment_method: 'bank_transfer' };

it('tiền mặt chưa có status → placed', () =>
  expect(computeOrderStatus(cash, t0)).toEqual({ status: 'placed', paymentStatus: 'unpaid' }));
it('thời gian trôi không làm đổi trạng thái đã lưu', () =>
  expect(computeOrderStatus({ ...cash, status: 'preparing' }, t0 + 10 ** 9).status).toBe('preparing'));
it('đơn quầy → completed/paid', () =>
  expect(computeOrderStatus({ ...cash, source: 'counter', status: 'completed', paid_at: iso(t0) }, t0)).toEqual({ status: 'completed', paymentStatus: 'paid' }));
it('online chưa trả, trong hạn → awaiting_payment/pending', () =>
  expect(computeOrderStatus(online, t0 + 299999)).toEqual({ status: 'awaiting_payment', paymentStatus: 'pending' }));
it('online chưa trả, đúng hạn → cancelled/expired', () =>
  expect(computeOrderStatus(online, t0 + 300000)).toEqual({ status: 'cancelled', paymentStatus: 'expired' }));
it('online đã trả, chưa có status → placed/paid', () =>
  expect(computeOrderStatus({ ...online, paid_at: iso(t0 + 60000) }, t0 + 75000)).toEqual({ status: 'placed', paymentStatus: 'paid' }));
it('online đã trả, status đã lưu được giữ nguyên', () =>
  expect(computeOrderStatus({ ...online, paid_at: iso(t0), status: 'delivering' }, t0 + 10 ** 9).status).toBe('delivering'));
describe('transitionOrder', () => {
  const placed = { ...cash, status: 'placed' };
  it('đi đúng từng bước', () => {
    const a = transitionOrder(placed, 'preparing', t0);
    const b = transitionOrder(a, 'delivering', t0);
    expect(transitionOrder(b, 'delivered', t0).status).toBe('delivered');
    expect(placed.status).toBe('placed');
  });
  it('huỷ được từ placed và preparing', () => {
    expect(transitionOrder(placed, 'cancelled', t0).status).toBe('cancelled');
    expect(transitionOrder({ ...cash, status: 'preparing' }, 'cancelled', t0).status).toBe('cancelled');
  });
  it.each([
    ['nhảy bước', { ...cash, status: 'placed' }, 'delivered'],
    ['huỷ khi đang giao', { ...cash, status: 'delivering' }, 'cancelled'],
    ['đơn chờ thanh toán', online, 'preparing'],
    ['đơn quầy', { ...cash, source: 'counter', status: 'completed', paid_at: iso(t0) }, 'delivered'],
    ['đã giao', { ...cash, status: 'delivered' }, 'cancelled'],
  ])('%s → 409', (_, order, next) => {
    expect(() => transitionOrder(order, next, t0)).toThrow(expect.objectContaining({ status: 409 }));
  });
});
it('newOrderId khớp CF + 8 số', () => expect(newOrderId()).toMatch(/^CF\d{8}$/));
describe('loadStoredOrders', () => {
  beforeEach(() => { localStorage.clear(); vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => vi.restoreAllMocks());
  it('chưa có dữ liệu → []', () => expect(loadStoredOrders()).toEqual([]));
  it('JSON hỏng → [] và warn', () => {
    localStorage.setItem(MOCK_ORDERS_KEY, '{hỏng');
    expect(loadStoredOrders()).toEqual([]);
    expect(console.warn).toHaveBeenCalled();
  });
  it('không phải mảng → []', () => {
    localStorage.setItem(MOCK_ORDERS_KEY, '{"a":1}');
    expect(loadStoredOrders()).toEqual([]);
  });
});

describe('log không lộ dữ liệu khách', () => {
  it('JSON hỏng chứa SĐT: warn không chứa SĐT', () => {
    localStorage.clear();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(MOCK_ORDERS_KEY, 'phone 0901234567');
    expect(loadStoredOrders()).toEqual([]);
    expect(JSON.stringify(warn.mock.calls)).not.toContain('0901234567');
    warn.mockRestore();
  });
});
