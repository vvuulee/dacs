import { screen } from '@testing-library/react';
import { renderWithProviders } from './test/renderWithProviders';
import App from './App';
import { signInStaff } from './test/staffTestUtils';

vi.mock('./api', async () => (await import('./test/mockApi')).mockApiModule());

beforeEach(() => localStorage.clear());

it('route lạ hiện NotFoundPage với link về trang chủ', () => {
  renderWithProviders(<App />, { route: '/khong-co-trang-nay' });
  expect(screen.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /về trang chủ/i })).toHaveAttribute('href', '/');
});
it('có header và footer trên mọi trang', () => {
  renderWithProviders(<App />, { route: '/khong-co-trang-nay' });
  expect(screen.getByRole('banner')).toBeInTheDocument();
  expect(screen.getByRole('contentinfo')).toBeInTheDocument();
});

it('/staff/* không có header/footer của khách', async () => {
  renderWithProviders(<App />, { route: '/staff/login' });
  expect(await screen.findByRole('heading', { name: 'Đăng nhập nhân viên' })).toBeInTheDocument();
  expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Menu' })).not.toBeInTheDocument();
});
it('/staff có sidebar 6 mục và tên nhân viên khi đã đăng nhập', async () => {
  await signInStaff();
  renderWithProviders(<App />, { route: '/staff' });
  const nav = await screen.findByRole('navigation', { name: 'Menu nhân viên' });
  for (const name of ['Bán hàng', 'Đơn online', 'Voucher', 'Tồn kho', 'Lịch sử', 'Tài khoản']) {
    expect(nav).toContainElement(screen.getByRole('link', { name }));
  }
  expect(await screen.findByText('Nhân viên Mẫu')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Đăng xuất' })).toBeInTheDocument();
});
it('/staff/khong-co hiện NotFound trong khu nhân viên', async () => {
  await signInStaff();
  renderWithProviders(<App />, { route: '/staff/khong-co' });
  expect(await screen.findByRole('heading', { name: 'Không tìm thấy trang' })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Menu nhân viên' })).toBeInTheDocument();
});
it('trang khách vẫn có header', () => {
  renderWithProviders(<App />, { route: '/menu' });
  expect(screen.getByRole('banner')).toBeInTheDocument();
});
