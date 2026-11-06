import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { adapter } from '../api';
import { request } from '../api/client';
import { LOGIN_FAILED_TEXT, SESSION_EXPIRED_TEXT } from '../features/auth/messages';
import { clearSession, readSession, saveSession } from '../features/auth/session';
import { LocationDisplay, renderWithProviders } from '../test/renderWithProviders';
import LoginPage from './LoginPage';

vi.mock('../api', async () => {
  const { createMockAdapter } = await import('../api/adapters/mockAdapter');
  return { adapter: createMockAdapter(0) };
});

const USER = { name: 'An', email: 'an@x.vn', password: 'matkhau123' };
const renderLogin = (route = '/login') =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<div>TRANG ĐÍCH</div>} />
      </Routes>
      <LocationDisplay />
    </>,
    { route },
  );
const location = () => screen.getByTestId('location');
async function signIn(email = 'an@x.vn', password = 'matkhau123') {
  await userEvent.clear(screen.getByLabelText('Email'));
  await userEvent.type(screen.getByLabelText('Email'), email);
  await userEvent.clear(screen.getByLabelText('Mật khẩu'));
  await userEvent.type(screen.getByLabelText('Mật khẩu'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
}

beforeEach(async () => { localStorage.clear(); clearSession(); await adapter.register(USER); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); clearSession(); });

it('đăng nhập thành công chuyển tới returnTo hợp lệ', async () => {
  renderLogin(`/login?returnTo=${encodeURIComponent('/orders/CF1')}`);
  await signIn();
  await waitFor(() => expect(location()).toHaveTextContent(/^\/orders\/CF1$/));
  expect(readSession()).not.toBeNull();
});
it('returnTo độc hại (//evil.com) chuyển về "/"', async () => {
  renderLogin(`/login?returnTo=${encodeURIComponent('//evil.com')}`);
  await signIn();
  await waitFor(() => expect(location()).toHaveTextContent(/^\/$/));
});
it('sai mật khẩu và email lạ cùng hiện LOGIN_FAILED_TEXT, vẫn ở /login', async () => {
  renderLogin();
  await signIn('an@x.vn', 'sai-mat-khau');
  const wrongPassword = (await screen.findByRole('alert')).textContent;
  await signIn('khong@co.vn', 'matkhau123');
  await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(wrongPassword));
  expect(wrongPassword).toBe(LOGIN_FAILED_TEXT);
  expect(location()).toHaveTextContent(/^\/login$/);
});
it('form rỗng: lỗi dưới ô, focus ô Email, không gọi adapter.login', async () => {
  const spy = vi.spyOn(adapter, 'login');
  renderLogin();
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(screen.getByText('Nhập email hợp lệ')).toBeInTheDocument();
  expect(screen.getByText('Nhập mật khẩu')).toBeInTheDocument();
  expect(screen.getByLabelText('Email')).toHaveFocus();
  expect(spy).not.toHaveBeenCalled();
});
it('hiện thông báo hết phiên khi bị 401', async () => {
  renderLogin();
  saveSession({ token: 'tk', expiresAt: '2099-01-01T00:00:00.000Z' });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
  await act(async () => { await request('/me', { baseUrl: '/api' }).catch(() => {}); });
  expect(await screen.findByText(SESSION_EXPIRED_TEXT)).toBeInTheDocument();
});
it('đã đăng nhập thì chuyển ngay tới returnTo', async () => {
  const { token, expires_at: expiresAt } = await adapter.login({ email: USER.email, password: USER.password });
  saveSession({ token, expiresAt });
  renderLogin(`/login?returnTo=${encodeURIComponent('/menu')}`);
  await waitFor(() => expect(location()).toHaveTextContent(/^\/menu$/));
});
it('link Đăng ký giữ returnTo; link Quên mật khẩu → /forgot-password', () => {
  renderLogin(`/login?returnTo=${encodeURIComponent('/menu')}`);
  expect(screen.getByRole('link', { name: 'Đăng ký tài khoản' })).toHaveAttribute('href', '/register?returnTo=%2Fmenu');
  expect(screen.getByRole('link', { name: 'Quên mật khẩu?' })).toHaveAttribute('href', '/forgot-password');
});
