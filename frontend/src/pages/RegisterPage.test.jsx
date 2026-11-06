import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { adapter } from '../api';
import { EMAIL_TAKEN_TEXT } from '../features/auth/messages';
import { clearSession, readSession } from '../features/auth/session';
import { LocationDisplay, renderWithProviders } from '../test/renderWithProviders';
import RegisterPage from './RegisterPage';

vi.mock('../api', async () => {
  const { createMockAdapter } = await import('../api/adapters/mockAdapter');
  return { adapter: createMockAdapter(0) };
});

const renderRegister = (route = '/register') =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<div>TRANG ĐÍCH</div>} />
      </Routes>
      <LocationDisplay />
    </>,
    { route },
  );
async function fill({ name = 'Nguyễn An', email = 'an@x.vn', password = 'matkhau123', confirm = password } = {}) {
  await userEvent.type(screen.getByLabelText('Họ tên'), name);
  await userEvent.type(screen.getByLabelText('Email'), email);
  await userEvent.type(screen.getByLabelText('Mật khẩu'), password);
  await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu'), confirm);
}
const submit = () => userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));

beforeEach(() => { localStorage.clear(); clearSession(); });
afterEach(() => { vi.restoreAllMocks(); clearSession(); });

it('đăng ký thành công: đã đăng nhập và chuyển về "/"', async () => {
  renderRegister();
  await fill();
  await submit();
  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/));
  expect(readSession()).not.toBeNull();
  expect((await adapter.getMe()).name).toBe('Nguyễn An');
});
it('đăng ký xong chuyển tới returnTo hợp lệ', async () => {
  renderRegister(`/register?returnTo=${encodeURIComponent('/menu')}`);
  await fill();
  await submit();
  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/menu$/));
});
it('email trùng: lỗi EMAIL_TAKEN_TEXT dưới ô email, không đăng nhập', async () => {
  await adapter.register({ name: 'Người khác', email: 'an@x.vn', password: 'matkhau123' });
  renderRegister();
  await fill();
  await submit();
  expect(await screen.findByText(EMAIL_TAKEN_TEXT)).toBeInTheDocument();
  expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  expect(readSession()).toBeNull();
});
it('nhập lại mật khẩu lệch: lỗi và không gọi adapter.register', async () => {
  const spy = vi.spyOn(adapter, 'register');
  renderRegister();
  await fill({ confirm: 'khac-nhau-123' });
  await submit();
  expect(screen.getByText('Mật khẩu nhập lại không khớp')).toBeInTheDocument();
  expect(spy).not.toHaveBeenCalled();
});
it('form rỗng: focus ô Họ tên đầu tiên', async () => {
  renderRegister();
  await submit();
  expect(screen.getByLabelText('Họ tên')).toHaveFocus();
});
it('bấm Tạo tài khoản hai lần liên tiếp chỉ gọi adapter.register một lần', async () => {
  const spy = vi.spyOn(adapter, 'register');
  renderRegister();
  await fill();
  await userEvent.dblClick(screen.getByRole('button', { name: 'Tạo tài khoản' }));
  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/));
  expect(spy).toHaveBeenCalledTimes(1);
});
