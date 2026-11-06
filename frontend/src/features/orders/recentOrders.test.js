import { RECENT_ORDERS_KEY } from '../../constants';
import { addRecentOrder, findRecentOrder, loadRecentOrders } from './recentOrders';

const entry = (n, phone = '0901234567') => ({ id: `CF${n}`, phone, createdAt: `2026-10-30T03:00:0${n % 10}.000Z` });

beforeEach(() => { localStorage.clear(); vi.spyOn(console, 'warn').mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());

it('add rồi load trả lại, mới nhất trước', () => {
  addRecentOrder(entry(1));
  addRecentOrder(entry(2));
  expect(loadRecentOrders().map((e) => e.id)).toEqual(['CF2', 'CF1']);
});
it('trùng id: lên đầu, không nhân đôi, cập nhật SĐT', () => {
  addRecentOrder(entry(1));
  addRecentOrder(entry(2));
  const list = addRecentOrder(entry(1, '0911111111'));
  expect(list.map((e) => e.id)).toEqual(['CF1', 'CF2']);
  expect(list[0].phone).toBe('0911111111');
});
it('thêm 11 đơn chỉ giữ 10 đơn mới nhất', () => {
  for (let n = 1; n <= 11; n += 1) addRecentOrder(entry(n));
  const ids = loadRecentOrders().map((e) => e.id);
  expect(ids).toHaveLength(10);
  expect(ids[0]).toBe('CF11');
  expect(ids).not.toContain('CF1');
});
it('findRecentOrder trả đúng đơn; id lạ → undefined', () => {
  addRecentOrder(entry(1));
  expect(findRecentOrder('CF1')).toEqual(entry(1));
  expect(findRecentOrder('CF9')).toBeUndefined();
});
it('JSON hỏng → [] và warn', () => {
  localStorage.setItem(RECENT_ORDERS_KEY, '{hỏng');
  expect(loadRecentOrders()).toEqual([]);
  expect(console.warn).toHaveBeenCalled();
});
it('sai version hoặc phần tử sai kiểu → []', () => {
  localStorage.setItem(RECENT_ORDERS_KEY, JSON.stringify({ version: 99, items: [entry(1)] }));
  expect(loadRecentOrders()).toEqual([]);
  localStorage.setItem(RECENT_ORDERS_KEY, JSON.stringify({ version: 1, items: [{ id: 1 }] }));
  expect(loadRecentOrders()).toEqual([]);
});
it('setItem ném QuotaExceededError → addRecentOrder không ném', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
  expect(() => addRecentOrder(entry(1))).not.toThrow();
});

it('JSON hỏng không làm lộ SĐT trong log (JSON.parse có thể nhúng đoạn dữ liệu vào thông báo lỗi)', () => {
  localStorage.setItem(RECENT_ORDERS_KEY, 'phone 0901234567');
  expect(loadRecentOrders()).toEqual([]);
  expect(JSON.stringify(console.warn.mock.calls)).not.toContain('0901234567');
});
