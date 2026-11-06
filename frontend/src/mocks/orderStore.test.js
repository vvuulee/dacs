import { MOCK_ORDERS_KEY } from '../constants';
import { computeOrderStatus, loadStoredOrders, newOrderId } from './orderStore';

const t0 = 1_000_000;
const iso = (ms) => new Date(ms).toISOString();
const cash = { id: 'CF1', payment_method: 'cash', created_at: iso(t0), paid_at: null };
const online = { ...cash, payment_method: 'bank_transfer' };

it.each([[0, 'placed'], [14999, 'placed'], [15000, 'preparing'], [44999, 'preparing'], [45000, 'delivering'], [89999, 'delivering'], [90000, 'delivered']])(
  'tiền mặt +%ims → %s',
  (dt, status) => expect(computeOrderStatus(cash, t0 + dt)).toEqual({ status, paymentStatus: 'unpaid' }),
);
it('online chưa trả, trong hạn → awaiting_payment/pending', () =>
  expect(computeOrderStatus(online, t0 + 299999)).toEqual({ status: 'awaiting_payment', paymentStatus: 'pending' }));
it('online chưa trả, đúng hạn → cancelled/expired', () =>
  expect(computeOrderStatus(online, t0 + 300000)).toEqual({ status: 'cancelled', paymentStatus: 'expired' }));
it('online đã trả tính mốc từ paid_at', () =>
  expect(computeOrderStatus({ ...online, paid_at: iso(t0 + 60000) }, t0 + 75000)).toEqual({ status: 'preparing', paymentStatus: 'paid' }));
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
