import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { adapter } from '../api';
import ProtectedRoute from '../components/ProtectedRoute';
import { clearSession, readSession, saveSession } from '../features/auth/session';
import { LocationDisplay, renderWithProviders } from '../test/renderWithProviders';
import AccountPage from './AccountPage';

vi.mock('../api', async () => {
  const { createMockAdapter } = await import('../api/adapters/mockAdapter');
  return { adapter: createMockAdapter(0) };
});

const renderAccount = () =>
  renderWithProviders(
    <>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/account" element={<AccountPage />} />
        </Route>
        <Route path="/" element={<div>TRANG CHỦ</div>} />
        <Route path="/login" element={<div>TRANG ĐĂNG NHẬP</div>} />
      </Routes>
      <LocationDisplay />
    </>,
    { route: '/account' },
  );

beforeEach(async () => {
  localStorage.clear();
  clearSession();
  const result = await adapter.register({ name: 'An', email: 'an@x.vn', password: 'matkhau123' });
  saveSession({ token: result.token, expiresAt: result.expires_at });
});
afterEach(() => { vi.restoreAllMocks(); clearSession(); });

it('hiện tiêu đề, hồ sơ, đổi mật khẩu và link Lịch sử đơn', async () => {
  renderAccount();
  expect(await screen.findByRole('heading', { name: 'Tài khoản' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Hồ sơ' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Đổi mật khẩu' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Lịch sử đơn' })).toHaveAttribute('href', '/account/orders');
});
it('Đăng xuất: về "/" (không bị đẩy sang /login), phiên bị xóa', async () => {
  renderAccount();
  await userEvent.click(await screen.findByRole('button', { name: 'Đăng xuất' }));
  expect(await screen.findByText('TRANG CHỦ')).toBeInTheDocument();
  await waitFor(() => expect(readSession()).toBeNull());
  expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
  expect(screen.queryByText('TRANG ĐĂNG NHẬP')).toBeNull();
});
it('chưa đăng nhập vào /account → chuyển tới đăng nhập', async () => {
  clearSession();
  renderAccount();
  expect(await screen.findByText('TRANG ĐĂNG NHẬP')).toBeInTheDocument();
  expect(screen.getByTestId('location')).toHaveTextContent('/login?returnTo=%2Faccount');
});
