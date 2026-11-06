import { act, fireEvent, screen } from '@testing-library/react';
import { adapter } from '../api';
import { CART_STORAGE_KEY } from '../constants';
import { clearSession, saveSession } from '../features/auth/session';
import { LocationDisplay, renderWithProviders } from '../test/renderWithProviders';
import Header from './Header';

vi.mock('../api', async () => {
  const { createMockAdapter } = await import('../api/adapters/mockAdapter');
  return { adapter: createMockAdapter(0) };
});

const line = { key: 'k', productId: '1', name: 'A', image: '', sizeId: null, toppingIds: [], note: '', quantity: 3, unitPrice: 1000 };

beforeEach(() => { localStorage.clear(); clearSession(); });
afterEach(() => vi.useRealTimers());

it('hiện số lượng giỏ', () => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ version: 1, items: [line] }));
  renderWithProviders(<Header />);
  expect(screen.getByLabelText(/giỏ hàng/i)).toHaveTextContent('3');
});
it('gõ vào ô tìm: URL đổi ?q= sau 300ms, giữ category', () => {
  vi.useFakeTimers();
  renderWithProviders(<><Header /><LocationDisplay /></>, { route: '/menu?category=tra' });
  fireEvent.change(screen.getByRole('searchbox', { name: /tìm món/i }), { target: { value: 'ca' } });
  act(() => vi.advanceTimersByTime(299));
  expect(screen.getByTestId('location')).toHaveTextContent('/menu?category=tra');
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByTestId('location')).toHaveTextContent('/menu?category=tra&q=ca');
});
it('ô tìm chỉ khoảng trắng không chuyển trang', () => {
  vi.useFakeTimers();
  renderWithProviders(<><Header /><LocationDisplay /></>, { route: '/' });
  fireEvent.change(screen.getByRole('searchbox', { name: /tìm món/i }), { target: { value: '   ' } });
  act(() => vi.advanceTimersByTime(300));
  expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
});
it('có link Đơn hàng → /orders', () => {
  renderWithProviders(<Header />);
  expect(screen.getByRole('link', { name: 'Đơn hàng' })).toHaveAttribute('href', '/orders');
});
it('có link tới Trang chủ và Menu', () => {
  renderWithProviders(<Header />);
  expect(screen.getByRole('link', { name: 'Menu' })).toHaveAttribute('href', '/menu');
  expect(screen.getByRole('link', { name: 'Trang chủ' })).toHaveAttribute('href', '/');
});

it('anonymous: có link "Đăng nhập" → /login', () => {
  renderWithProviders(<Header />);
  expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/login');
});
it('authenticated: có link "Tài khoản: An" → /account và không còn link Đăng nhập', async () => {
  const result = await adapter.register({ name: 'An', email: 'an@x.vn', password: 'matkhau123' });
  saveSession({ token: result.token, expiresAt: result.expires_at });
  renderWithProviders(<Header />);
  expect(await screen.findByRole('link', { name: 'Tài khoản: An' })).toHaveAttribute('href', '/account');
  expect(screen.queryByRole('link', { name: 'Đăng nhập' })).toBeNull();
});
it('đang kiểm tra phiên (loading): không hiện link Đăng nhập hay Tài khoản', () => {
  saveSession({ token: 'tk', expiresAt: '2099-01-01T00:00:00.000Z' });
  vi.spyOn(adapter, 'getMe').mockReturnValue(new Promise(() => {}));
  renderWithProviders(<Header />);
  expect(screen.queryByRole('link', { name: 'Đăng nhập' })).toBeNull();
  expect(screen.queryByRole('link', { name: /Tài khoản/ })).toBeNull();
});

it('có link "Cửa hàng" → /stores, đứng sau Menu', () => {
  renderWithProviders(<Header />);
  expect(screen.getByRole('link', { name: 'Cửa hàng' })).toHaveAttribute('href', '/stores');
  const names = screen.getAllByRole('link').map((l) => l.textContent);
  expect(names.indexOf('Cửa hàng')).toBe(names.indexOf('Menu') + 1);
});

it('có link "Ưu đãi" → /offers và nav đúng thứ tự', () => {
  renderWithProviders(<Header />);
  expect(screen.getByRole('link', { name: 'Ưu đãi' })).toHaveAttribute('href', '/offers');
  const order = ['Trang chủ', 'Menu', 'Cửa hàng', 'Ưu đãi', 'Đơn hàng'];
  const names = screen.getAllByRole('link').map((l) => l.textContent).filter((t) => order.includes(t));
  expect(names).toEqual(order);
});
