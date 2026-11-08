import { adapter } from '../api';
import * as staff from './staffService';

vi.mock('../api', () => ({
  adapter: {
    staffLogin: vi.fn(), staffLogout: vi.fn(), staffGetMe: vi.fn(), staffChangePassword: vi.fn(),
    staffCreateOrder: vi.fn(), staffGetOnlineOrders: vi.fn(), staffUpdateOrderStatus: vi.fn(), staffGetTodayOrders: vi.fn(),
    staffGetTodayReport: vi.fn(), staffGetVouchers: vi.fn(), staffCreateVoucher: vi.fn(), staffDeleteVoucher: vi.fn(),
    staffGetProducts: vi.fn(), staffSetAvailability: vi.fn(),
  },
}));
const rawStaff = { id: 's1', name: 'NV', email: 'nv@x.vn', role: 'staff' };

it('login cắt khoảng trắng email, giữ nguyên mật khẩu, trả StaffAuth', async () => {
  adapter.staffLogin.mockResolvedValue({ token: 't', expires_at: 'e', staff: rawStaff });
  expect(await staff.login({ email: ' nv@x.vn ', password: ' p ' })).toEqual({ token: 't', expiresAt: 'e', staff: rawStaff });
  expect(adapter.staffLogin).toHaveBeenCalledWith({ email: 'nv@x.vn', password: ' p ' });
});
it('getMe map staff', async () => {
  adapter.staffGetMe.mockResolvedValue(rawStaff);
  expect(await staff.getMe()).toEqual(rawStaff);
});
it('changePassword gửi snake_case', async () => {
  await staff.changePassword({ currentPassword: 'a', newPassword: 'b' });
  expect(adapter.staffChangePassword).toHaveBeenCalledWith({ current_password: 'a', new_password: 'b' });
});

const rawOrder = {
  id: 'CF1', status: 'completed', payment_method: 'cash', payment_status: 'paid', source: 'counter', service_type: 'takeaway',
  table: null, customer: null, address: null, items: [], subtotal: 0, delivery_fee: 0, total: 0, created_at: 'x', payment: null,
};
it('getOnlineOrders/getTodayOrders map đơn và bỏ đơn hỏng', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  adapter.staffGetOnlineOrders.mockResolvedValue([rawOrder, { id: 'hỏng' }]);
  adapter.staffGetTodayOrders.mockResolvedValue([rawOrder]);
  expect(await staff.getOnlineOrders()).toHaveLength(1);
  expect((await staff.getTodayOrders())[0].source).toBe('counter');
  vi.restoreAllMocks();
});
it('updateOrderStatus, deleteVoucher, setAvailability chuyển tham số', async () => {
  adapter.staffUpdateOrderStatus.mockResolvedValue(rawOrder);
  adapter.staffSetAvailability.mockResolvedValue({ id: 'bac-xiu', name: 'Bạc xỉu', category_id: 'ca-phe', base_price: 29000, sizes: [], toppings: [], is_available: false });
  await staff.updateOrderStatus('CF1', 'preparing');
  await staff.deleteVoucher('v1');
  expect((await staff.setAvailability('bac-xiu', false)).isAvailable).toBe(false);
  expect(adapter.staffUpdateOrderStatus).toHaveBeenCalledWith('CF1', 'preparing');
  expect(adapter.staffDeleteVoucher).toHaveBeenCalledWith('v1');
  expect(adapter.staffSetAvailability).toHaveBeenCalledWith('bac-xiu', false);
});
