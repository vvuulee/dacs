import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { adapter } from '../api';
import { ApiError } from '../api/client';
import { FORGOT_SENT_TEXT } from '../features/auth/messages';
import { clearSession } from '../features/auth/session';
import { renderWithProviders } from '../test/renderWithProviders';
import ForgotPasswordPage from './ForgotPasswordPage';

vi.mock('../api', async () => {
  const { createMockAdapter } = await import('../api/adapters/mockAdapter');
  return { adapter: createMockAdapter(0) };
});

const submit = async (email) => {
  await userEvent.type(screen.getByLabelText('Email'), email);
  await userEvent.click(screen.getByRole('button', { name: 'Gửi hướng dẫn' }));
};

beforeEach(() => { localStorage.clear(); clearSession(); });
afterEach(() => vi.restoreAllMocks());

it('email có tài khoản: hiện FORGOT_SENT_TEXT và hộp thư giả lập có link đặt lại mật khẩu', async () => {
  await adapter.register({ name: 'An', email: 'an@x.vn', password: 'matkhau123' });
  renderWithProviders(<ForgotPasswordPage />);
  await submit('an@x.vn');
  expect(await screen.findByText(FORGOT_SENT_TEXT)).toBeInTheDocument();
  const link = within(await screen.findByLabelText('Hộp thư giả lập')).getByRole('link', { name: 'Đặt lại mật khẩu' });
  expect(link.getAttribute('href')).toMatch(/^\/reset-password\?token=[0-9a-f]{32}$/);
});
it('email không có tài khoản: vẫn hiện FORGOT_SENT_TEXT, không có hộp thư giả lập', async () => {
  const peek = vi.spyOn(adapter, 'peekResetToken');
  renderWithProviders(<ForgotPasswordPage />);
  await submit('khong@co.vn');
  expect(await screen.findByText(FORGOT_SENT_TEXT)).toBeInTheDocument();
  await vi.waitFor(() => expect(peek).toHaveBeenCalledOnce());
  await expect(peek.mock.results[0].value).resolves.toBeNull();
  expect(screen.queryByLabelText('Hộp thư giả lập')).toBeNull();
});
it('email sai định dạng: lỗi dưới ô, không gọi adapter.forgotPassword', async () => {
  const spy = vi.spyOn(adapter, 'forgotPassword');
  renderWithProviders(<ForgotPasswordPage />);
  await submit('abc');
  expect(screen.getByText('Nhập email hợp lệ')).toBeInTheDocument();
  expect(spy).not.toHaveBeenCalled();
});
it('lỗi máy chủ: hiện alert, không hiện thông báo đã gửi', async () => {
  vi.spyOn(adapter, 'forgotPassword').mockRejectedValue(new ApiError(500, 'Máy chủ trả lỗi 500'));
  renderWithProviders(<ForgotPasswordPage />);
  await submit('an@x.vn');
  expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ trả lỗi 500');
  expect(screen.queryByText(FORGOT_SENT_TEXT)).toBeNull();
});
