import { MOCK_VOUCHERS_KEY } from '../constants';
import { vouchers } from './offers';
import { loadVouchers, saveVouchers } from './voucherStore';

beforeEach(() => { localStorage.clear(); vi.spyOn(console, 'warn').mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());

it('lần đầu nạp dữ liệu mẫu từ offers.js', () => expect(loadVouchers()).toEqual(vouchers));
it('saveVouchers rồi loadVouchers trả đúng danh sách đã lưu', () => {
  saveVouchers([vouchers[0]]);
  expect(loadVouchers()).toEqual([vouchers[0]]);
});
it('danh sách rỗng đã lưu không bị nạp lại dữ liệu mẫu', () => {
  saveVouchers([]);
  expect(loadVouchers()).toEqual([]);
});
it('JSON hỏng → [] và warn', () => {
  localStorage.setItem(MOCK_VOUCHERS_KEY, '{hỏng');
  expect(loadVouchers()).toEqual([]);
  expect(console.warn).toHaveBeenCalled();
});
