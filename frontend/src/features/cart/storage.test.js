import { CART_STORAGE_KEY } from '../../constants';
import { loadCart, saveCart } from './storage';

const line = { key: 'k', productId: '1', name: 'A', image: '', sizeId: null, toppingIds: [], note: '', quantity: 2, unitPrice: 30000 };

beforeEach(() => { localStorage.clear(); vi.spyOn(console, 'warn').mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());

it('save rồi load trả lại giống hệt', () => { saveCart([line]); expect(loadCart()).toEqual([line]); });
it('chưa có dữ liệu → []', () => expect(loadCart()).toEqual([]));
it('JSON hỏng → [] và warn', () => {
  localStorage.setItem(CART_STORAGE_KEY, '{không phải json');
  expect(loadCart()).toEqual([]);
  expect(console.warn).toHaveBeenCalled();
});
it('sai version → []', () => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ version: 999, items: [line] }));
  expect(loadCart()).toEqual([]);
});
it.each([{ quantity: 0 }, { quantity: 100 }, { unitPrice: -1 }])('item hỏng %o → []', (bad) => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ version: 1, items: [{ ...line, ...bad }] }));
  expect(loadCart()).toEqual([]);
});
it('setItem ném QuotaExceededError → saveCart không ném', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
  expect(() => saveCart([line])).not.toThrow();
});
it('getItem ném lỗi (bị chặn) → loadCart trả []', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  expect(loadCart()).toEqual([]);
});
