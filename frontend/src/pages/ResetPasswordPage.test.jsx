import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { adapter } from '../api';
import { RESET_LINK_INVALID_TEXT } from '../features/auth/messages';
import { clearSession } from '../features/auth/session';
import { renderWithProviders } from '../test/renderWithProviders';
import ResetPasswordPage from './ResetPasswordPage';

vi.mock('../api', async () => {
  const { createMockAdapter } = await import('../api/adapters/mockAdapter');
  return { adapter: createMockAdapter(0) };
});

const NEW = { name: 'An', email: 'an@x.vn', password: 'matkhau123' };
async function issueToken() {
  await adapter.register(NEW);
  await adapter.forgotPassword({ email: NEW.email });
  return adapter.peekResetToken(NEW.email);
}
const renderReset = (search = '') =>
  renderWithProviders(<Routes><Route path="/reset-password" element={<ResetPasswordPage />} /></Routes>, { route: `/reset-password${search}` });
async function fill(password, confirm = password) {
  await userEvent.type(screen.getByLabelText('Mật khẩu mới'), password);
  await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu mới'), confirm);
  await userEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));
}

beforeEach(() => { localStorage.clear(); clearSession(); });
afterEach(() => vi.restoreAllMocks());

it('không có token trong URL: RESET_LINK_INVALID_TEXT và link /forgot-password', () => {
  renderReset();
  expect(screen.getByRole('alert')).toHaveTextContent(RESET_LINK_INVALID_TEXT);
  expect(screen.getByRole('link', { name: 'Yêu cầu liên kết mới' })).toHaveAttribute('href', '/forgot-password');
});
it('token đúng + mật khẩu hợp lệ: "Đã đặt lại mật khẩu" và đăng nhập được bằng mật khẩu mới', async () => {
  const token = await issueToken();
  renderReset(`?token=${token}`);
  await fill('matkhau456');
  expect(await screen.findByText('Đã đặt lại mật khẩu')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/login');
  expect((await adapter.login({ email: NEW.email, password: 'matkhau456' })).user.email).toBe('an@x.vn');
});
it('token đã dùng: RESET_LINK_INVALID_TEXT', async () => {
  const token = await issueToken();
  await adapter.resetPassword({ token, new_password: 'matkhau456' });
  renderReset(`?token=${token}`);
  await fill('matkhau789');
  expect(await screen.findByText(RESET_LINK_INVALID_TEXT)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Yêu cầu liên kết mới' })).toBeInTheDocument();
});
it('mật khẩu 7 ký tự hoặc nhập lại lệch: lỗi dưới ô, không gọi adapter.resetPassword', async () => {
  const token = await issueToken();
  const spy = vi.spyOn(adapter, 'resetPassword');
  renderReset(`?token=${token}`);
  await fill('a'.repeat(7));
  expect(screen.getByText('Mật khẩu từ 8 đến 128 ký tự')).toBeInTheDocument();
  await userEvent.clear(screen.getByLabelText('Mật khẩu mới'));
  await userEvent.clear(screen.getByLabelText('Nhập lại mật khẩu mới'));
  await fill('matkhau456', 'khac-nhau-1');
  expect(screen.getByText('Mật khẩu nhập lại không khớp')).toBeInTheDocument();
  expect(spy).not.toHaveBeenCalled();
});
it('không ghi token ra console', async () => {
  const token = await issueToken();
  const spies = ['log', 'warn', 'error'].map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
  renderReset(`?token=${token}`);
  await fill('matkhau456');
  await screen.findByText('Đã đặt lại mật khẩu');
  expect(JSON.stringify(spies.map((s) => s.mock.calls))).not.toContain(token);
});
