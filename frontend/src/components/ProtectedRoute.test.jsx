import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { adapter } from '../api';
import { clearSession, saveSession } from '../features/auth/session';
import { LocationDisplay, renderWithProviders } from '../test/renderWithProviders';
import ProtectedRoute from './ProtectedRoute';

vi.mock('../api', async () => {
  const { createMockAdapter } = await import('../api/adapters/mockAdapter');
  return { adapter: createMockAdapter(0) };
});

const renderAt = (route) =>
  renderWithProviders(
    <>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/account/orders" element={<div>NỘI DUNG RIÊNG TƯ</div>} />
        </Route>
        <Route path="/login" element={<div>TRANG ĐĂNG NHẬP</div>} />
      </Routes>
      <LocationDisplay />
    </>,
    { route },
  );

beforeEach(() => { localStorage.clear(); clearSession(); });
afterEach(() => { vi.restoreAllMocks(); clearSession(); });

it('loading: hiện khung chờ, không chuyển hướng và không lộ nội dung', () => {
  saveSession({ token: 'tk', expiresAt: '2099-01-01T00:00:00.000Z' });
  vi.spyOn(adapter, 'getMe').mockReturnValue(new Promise(() => {}));
  renderAt('/account/orders');
  expect(screen.queryByText('NỘI DUNG RIÊNG TƯ')).toBeNull();
  expect(screen.queryByText('TRANG ĐĂNG NHẬP')).toBeNull();
  expect(screen.getByTestId('location')).toHaveTextContent(/^\/account\/orders$/);
});
it('anonymous → /login?returnTo=<đường dẫn + query đã mã hóa>', async () => {
  renderAt('/account/orders?x=1');
  expect(await screen.findByText('TRANG ĐĂNG NHẬP')).toBeInTheDocument();
  expect(screen.getByTestId('location')).toHaveTextContent('/login?returnTo=%2Faccount%2Forders%3Fx%3D1');
});
it('authenticated → hiển thị trang con', async () => {
  const result = await adapter.register({ name: 'An', email: 'an@x.vn', password: 'matkhau123' });
  saveSession({ token: result.token, expiresAt: result.expires_at });
  renderAt('/account/orders');
  expect(await screen.findByText('NỘI DUNG RIÊNG TƯ')).toBeInTheDocument();
});
