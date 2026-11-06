import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { adapter } from '../api';
import { ApiError } from '../api/client';
import { CART_STORAGE_KEY, RECENT_ORDERS_KEY } from '../constants';
import { useAuth } from '../features/auth/AuthContext';
import { useCart } from '../features/cart/CartContext';
import { CHECKOUT_SESSION_EXPIRED_TEXT } from '../features/auth/messages';
import { readSession, saveSession } from '../features/auth/session';
import { VOUCHER_CART_CHANGED_TEXT } from '../features/vouchers/messages';
import { LocationDisplay, renderWithProviders } from '../test/renderWithProviders';
import CheckoutPage from './CheckoutPage';

vi.mock('../api', async () => {
  const { createMockAdapter } = await import('../api/adapters/mockAdapter');
  return { adapter: createMockAdapter(0) };
});

const line = { key: 'k1', productId: 'tra-dao', name: 'Trà đào cam sả', image: '', sizeId: 'm', toppingIds: ['thach'], note: 'ít đá', quantity: 2, unitPrice: 57000, summary: 'Vừa · Thạch trái cây' };
const seedCart = () => localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ version: 1, items: [line] }));
const renderCheckout = () => renderWithProviders(<><CheckoutPage /><LocationDisplay /></>, { route: '/checkout' });
const location = () => screen.getByTestId('location');

async function fillForm({ payment } = {}) {
  await userEvent.type(screen.getByLabelText('Họ tên'), 'Nguyễn An');
  await userEvent.type(screen.getByLabelText('Số điện thoại'), '0901234567');
  await screen.findByRole('option', { name: 'Hà Nội' });
  await userEvent.selectOptions(screen.getByLabelText('Tỉnh/Thành'), 'hn');
  await screen.findByRole('option', { name: 'Phường Mẫu 1' });
  await userEvent.selectOptions(screen.getByLabelText('Phường/Xã'), 'hn-1');
  await userEvent.type(screen.getByLabelText('Số nhà, tên đường'), '12 Lê Lợi');
  if (payment) await userEvent.click(screen.getByRole('radio', { name: payment }));
}
const submit = () => userEvent.click(screen.getByRole('button', { name: 'Đặt hàng' }));

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

it('giỏ trống hiện EmptyState và link về /menu', () => {
  renderCheckout();
  expect(screen.getByText('Giỏ hàng trống')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Về Menu' })).toHaveAttribute('href', '/menu');
});
it('form rỗng: hiện lỗi từng ô, focus ô Họ tên, không gọi createOrder', async () => {
  seedCart();
  const spy = vi.spyOn(adapter, 'createOrder');
  renderCheckout();
  await submit();
  expect(screen.getByText('Nhập họ tên từ 2 đến 60 ký tự')).toBeInTheDocument();
  expect(screen.getByText('Chọn tỉnh/thành', { selector: 'p' })).toBeInTheDocument();
  expect(screen.getByLabelText('Họ tên')).toHaveFocus();
  expect(spy).not.toHaveBeenCalled();
});
it('đổi tỉnh làm trống phường đã chọn', async () => {
  seedCart();
  renderCheckout();
  await fillForm();
  await userEvent.selectOptions(screen.getByLabelText('Tỉnh/Thành'), 'hcm');
  expect(screen.getByLabelText('Phường/Xã')).toHaveValue('');
});
it('hiện tóm tắt giỏ với tạm tính, chưa có phí giao', () => {
  seedCart();
  renderCheckout();
  expect(screen.getByText('Tạm tính').parentElement).toHaveTextContent(/114\.000/);
  expect(screen.queryByText('Phí giao hàng')).toBeNull();
});
it('đặt tiền mặt thành công: giỏ trống, đơn vào đơn gần đây, URL /orders/CF........', async () => {
  seedCart();
  renderCheckout();
  await fillForm();
  await submit();
  await vi.waitFor(() => expect(location()).toHaveTextContent(/^\/orders\/CF\d{8}$/));
  expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY)).items).toEqual([]);
  const [recent] = JSON.parse(localStorage.getItem(RECENT_ORDERS_KEY)).items;
  expect(recent).toMatchObject({ phone: '0901234567' });
  expect(location()).toHaveTextContent(recent.id);
});
it('đặt chuyển khoản: URL /payment/CF........', async () => {
  seedCart();
  renderCheckout();
  await fillForm({ payment: 'Chuyển khoản QR' });
  await submit();
  await vi.waitFor(() => expect(location()).toHaveTextContent(/^\/payment\/CF\d{8}$/));
});
it('đặt lỗi: alert hiện, giỏ và giá trị form còn nguyên', async () => {
  seedCart();
  vi.spyOn(adapter, 'createOrder').mockRejectedValue(new ApiError(500, 'Máy chủ trả lỗi 500'));
  renderCheckout();
  await fillForm();
  await submit();
  expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ trả lỗi 500');
  expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY)).items).toHaveLength(1);
  expect(screen.getByLabelText('Họ tên')).toHaveValue('Nguyễn An');
  expect(location()).toHaveTextContent(/^\/checkout$/);
});
it('bấm Đặt hàng hai lần liên tiếp chỉ gọi createOrder một lần', async () => {
  seedCart();
  const spy = vi.spyOn(adapter, 'createOrder');
  renderCheckout();
  await fillForm();
  await userEvent.dblClick(screen.getByRole('button', { name: 'Đặt hàng' }));
  await vi.waitFor(() => expect(location()).toHaveTextContent(/^\/orders\/CF/));
  expect(spy).toHaveBeenCalledTimes(1);
});
it('request gửi đi không chứa giá và có client_request_id', async () => {
  seedCart();
  const spy = vi.spyOn(adapter, 'createOrder');
  renderCheckout();
  await fillForm();
  await submit();
  await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
  const sent = spy.mock.calls[0][0];
  expect(JSON.stringify(sent)).not.toMatch(/price/i);
  expect(sent.client_request_id).toMatch(/^[0-9a-f-]{36}$/);
});

describe('khi đã đăng nhập', () => {
  const ADDRESS = { province_id: 'hn', ward_id: 'hn-1', street: '12 Lê Lợi' };
  function AuthStatus() { return <p data-testid="auth">{useAuth().status}</p>; }
  const renderSignedIn = () =>
    renderWithProviders(<><CheckoutPage /><LocationDisplay /><AuthStatus /></>, { route: '/checkout' });
  async function signIn() {
    const result = await adapter.register({ name: 'Nguyễn An', email: 'an@x.vn', password: 'matkhau123' });
    saveSession({ token: result.token, expiresAt: result.expires_at });
    await adapter.updateMe({ name: 'Nguyễn An', phone: '0901234567', address: ADDRESS });
  }

  it('điền sẵn tên, SĐT, tỉnh, phường, đường từ hồ sơ', async () => {
    seedCart();
    await signIn();
    renderSignedIn();
    await waitFor(() => expect(screen.getByLabelText('Họ tên')).toHaveValue('Nguyễn An'));
    expect(screen.getByLabelText('Số điện thoại')).toHaveValue('0901234567');
    expect(screen.getByLabelText('Số nhà, tên đường')).toHaveValue('12 Lê Lợi');
    await waitFor(() => expect(screen.getByLabelText('Tỉnh/Thành')).toHaveValue('hn'));
    await waitFor(() => expect(screen.getByLabelText('Phường/Xã')).toHaveValue('hn-1'));
  });
  it('không ghi đè ô khách đã gõ trước khi hồ sơ tải xong', async () => {
    seedCart();
    await signIn();
    const me = await adapter.getMe();
    let resolveMe;
    vi.spyOn(adapter, 'getMe').mockReturnValue(new Promise((resolve) => { resolveMe = resolve; }));
    renderSignedIn();
    await userEvent.type(screen.getByLabelText('Họ tên'), 'Tên Gõ Tay');
    await act(async () => { resolveMe(me); });
    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('authenticated'));
    expect(screen.getByLabelText('Họ tên')).toHaveValue('Tên Gõ Tay');
    expect(screen.getByLabelText('Số điện thoại')).toHaveValue('');
  });
  it('đặt thành công khi đã đăng nhập: đơn nằm trong getMyOrders của người đó', async () => {
    seedCart();
    await signIn();
    renderSignedIn();
    await waitFor(() => expect(screen.getByLabelText('Họ tên')).toHaveValue('Nguyễn An'));
    await submit();
    await vi.waitFor(() => expect(location()).toHaveTextContent(/^\/orders\/CF\d{8}$/));
    const mine = await adapter.getMyOrders();
    expect(mine).toHaveLength(1);
    expect(location()).toHaveTextContent(mine[0].id);
  });
  it('hết phiên giữa lúc đặt: báo hết phiên, giỏ và form còn nguyên, Header coi là khách', async () => {
    seedCart();
    await signIn();
    renderSignedIn();
    await waitFor(() => expect(screen.getByLabelText('Họ tên')).toHaveValue('Nguyễn An'));
    saveSession({ token: 'het-han', expiresAt: readSession().expiresAt }); // backend không còn nhận token này
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent(CHECKOUT_SESSION_EXPIRED_TEXT);
    expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY)).items).toHaveLength(1);
    expect(screen.getByLabelText('Họ tên')).toHaveValue('Nguyễn An');
    expect(readSession()).toBeNull();
    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('anonymous'));
    expect(location()).toHaveTextContent(/^\/checkout$/);
  });
  it('hết phiên rồi bấm Đặt hàng lại: tạo đơn khách (không gắn tài khoản), cùng client_request_id', async () => {
    seedCart();
    await signIn();
    const spy = vi.spyOn(adapter, 'createOrder');
    renderSignedIn();
    await waitFor(() => expect(screen.getByLabelText('Họ tên')).toHaveValue('Nguyễn An'));
    saveSession({ token: 'het-han', expiresAt: readSession().expiresAt });
    await submit();
    await screen.findByRole('alert');
    await submit();
    await vi.waitFor(() => expect(location()).toHaveTextContent(/^\/orders\/CF\d{8}$/));
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[1][0].client_request_id).toBe(spy.mock.calls[0][0].client_request_id);
    const login = await adapter.login({ email: 'an@x.vn', password: 'matkhau123' });
    saveSession({ token: login.token, expiresAt: login.expires_at });
    expect(await adapter.getMyOrders()).toEqual([]);
  });
});

describe('mã giảm giá', () => {
  // Giỏ mẫu: 2 × (45.000 + 6.000 size vừa + 6.000 thạch) = 114.000; CHAO10 → giảm 11.400.
  let cart;
  function CartProbe() { cart = useCart(); return null; }
  const renderWithCart = () => renderWithProviders(<><CheckoutPage /><LocationDisplay /><CartProbe /></>, { route: '/checkout' });
  const applyCode = async (code) => {
    await userEvent.type(screen.getByLabelText('Mã giảm giá'), code);
    await userEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
  };
  const orderId = () => location().textContent.split('/').pop();

  it('áp CHAO10 → "Đã áp dụng CHAO10", dòng Giảm giá −11.400, vẫn không có Tổng cộng', async () => {
    seedCart();
    renderWithCart();
    await applyCode('CHAO10');
    expect(await screen.findByText(/Đã áp dụng CHAO10/)).toBeInTheDocument();
    const row = screen.getByText('Giảm giá').parentElement;
    expect(row).toHaveTextContent(/−/);
    expect(row).toHaveTextContent(/11\.400/);
    expect(screen.queryByText('Tổng cộng')).toBeNull();
  });
  it('đặt hàng có mã gửi voucher_code; đơn có discount 11.400 và total = 114.000 + 15.000 − 11.400', async () => {
    seedCart();
    const spy = vi.spyOn(adapter, 'createOrder');
    renderWithCart();
    await applyCode('CHAO10');
    await screen.findByText(/Đã áp dụng CHAO10/);
    await fillForm();
    await submit();
    await vi.waitFor(() => expect(location()).toHaveTextContent(/^\/orders\/CF\d{8}$/));
    expect(spy.mock.calls[0][0].voucher_code).toBe('CHAO10');
    const order = await adapter.getOrder(orderId(), '0901234567');
    expect(order).toMatchObject({ subtotal: 114000, discount: 11400, voucher_code: 'CHAO10', total: 117600 });
  });
  it('không áp mã thì request không có khóa voucher_code', async () => {
    seedCart();
    const spy = vi.spyOn(adapter, 'createOrder');
    renderWithCart();
    await fillForm();
    await submit();
    await vi.waitFor(() => expect(spy).toHaveBeenCalledOnce());
    expect('voucher_code' in spy.mock.calls[0][0]).toBe(false);
  });
  it('Bỏ mã rồi đặt → request không có voucher_code', async () => {
    seedCart();
    const spy = vi.spyOn(adapter, 'createOrder');
    renderWithCart();
    await applyCode('CHAO10');
    await userEvent.click(await screen.findByRole('button', { name: 'Bỏ mã' }));
    expect(screen.queryByText('Giảm giá')).toBeNull();
    await fillForm();
    await submit();
    await vi.waitFor(() => expect(spy).toHaveBeenCalledOnce());
    expect('voucher_code' in spy.mock.calls[0][0]).toBe(false);
  });
  it('giỏ đổi sau khi áp mã → VOUCHER_CART_CHANGED_TEXT, không còn dòng giảm, request không có voucher_code', async () => {
    seedCart();
    const spy = vi.spyOn(adapter, 'createOrder');
    renderWithCart();
    await applyCode('CHAO10');
    await screen.findByText(/Đã áp dụng CHAO10/);
    await act(async () => cart.setQuantity('k1', 3));
    expect(await screen.findByText(VOUCHER_CART_CHANGED_TEXT)).toBeInTheDocument();
    expect(screen.queryByText('Giảm giá')).toBeNull();
    expect(screen.queryByText(/Đã áp dụng/)).toBeNull();
    await fillForm();
    await submit();
    await vi.waitFor(() => expect(spy).toHaveBeenCalledOnce());
    expect('voucher_code' in spy.mock.calls[0][0]).toBe(false);
  });
  it('mã hết hạn đúng lúc đặt → alert hiện đúng lý do, mã bị gỡ, giỏ và form còn nguyên', async () => {
    seedCart();
    vi.spyOn(adapter, 'createOrder').mockRejectedValueOnce(new ApiError(422, 'Mã giảm giá đã hết hạn', 'voucher_invalid'));
    renderWithCart();
    await applyCode('CHAO10');
    await screen.findByText(/Đã áp dụng CHAO10/);
    await fillForm();
    await submit();
    expect(await screen.findByText('Mã giảm giá đã hết hạn', { selector: '[role="alert"]' })).toBeInTheDocument();
    expect(screen.queryByText(/Đã áp dụng/)).toBeNull();
    expect(screen.queryByText('Giảm giá')).toBeNull();
    expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY)).items).toHaveLength(1);
    expect(screen.getByLabelText('Họ tên')).toHaveValue('Nguyễn An');
    expect(location()).toHaveTextContent(/^\/checkout$/);
  });
  it('sau voucher_invalid bấm Đặt hàng lại → client_request_id KHÁC, không voucher_code, đặt thành công', async () => {
    seedCart();
    const spy = vi.spyOn(adapter, 'createOrder').mockRejectedValueOnce(new ApiError(422, 'Mã giảm giá đã hết hạn', 'voucher_invalid'));
    renderWithCart();
    await applyCode('CHAO10');
    await screen.findByText(/Đã áp dụng CHAO10/);
    await fillForm();
    await submit();
    await screen.findByText('Mã giảm giá đã hết hạn', { selector: '[role="alert"]' });
    await submit();
    await vi.waitFor(() => expect(location()).toHaveTextContent(/^\/orders\/CF\d{8}$/));
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[1][0].client_request_id).not.toBe(spy.mock.calls[0][0].client_request_id);
    expect('voucher_code' in spy.mock.calls[1][0]).toBe(false);
  });
  it('lỗi khác (500) khi đặt có mã → giữ mã và dùng lại cùng client_request_id', async () => {
    seedCart();
    const spy = vi.spyOn(adapter, 'createOrder').mockRejectedValueOnce(new ApiError(500, 'Máy chủ trả lỗi 500'));
    renderWithCart();
    await applyCode('CHAO10');
    await screen.findByText(/Đã áp dụng CHAO10/);
    await fillForm();
    await submit();
    await screen.findByText('Máy chủ trả lỗi 500', { selector: '[role="alert"]' });
    expect(screen.getByText(/Đã áp dụng CHAO10/)).toBeInTheDocument();
    await submit();
    await vi.waitFor(() => expect(location()).toHaveTextContent(/^\/orders\/CF/));
    expect(spy.mock.calls[1][0].client_request_id).toBe(spy.mock.calls[0][0].client_request_id);
    expect(spy.mock.calls[1][0].voucher_code).toBe('CHAO10');
  });
});
