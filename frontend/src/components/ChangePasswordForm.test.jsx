import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { adapter } from '../api';
import { useAuth } from '../features/auth/AuthContext';
import { CURRENT_PASSWORD_WRONG_TEXT } from '../features/auth/messages';
import { clearSession, saveSession } from '../features/auth/session';
import { renderWithProviders } from '../test/renderWithProviders';
import ChangePasswordForm from './ChangePasswordForm';

vi.mock('../api', async () => {
  const { createMockAdapter } = await import('../api/adapters/mockAdapter');
  return { adapter: createMockAdapter(0) };
});

function Gate() {
  const { status } = useAuth();
  return status === 'authenticated' ? <ChangePasswordForm /> : null;
}
async function fill(current, next, confirm = next) {
  await userEvent.type(await screen.findByLabelText('Mật khẩu hiện tại'), current);
  await userEvent.type(screen.getByLabelText('Mật khẩu mới'), next);
  await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu mới'), confirm);
  await userEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
}

beforeEach(async () => {
  localStorage.clear();
  clearSession();
  const result = await adapter.register({ name: 'An', email: 'an@x.vn', password: 'matkhau123' });
  saveSession({ token: result.token, expiresAt: result.expires_at });
});
afterEach(() => { vi.restoreAllMocks(); clearSession(); });

it('đổi mật khẩu đúng: "Đã đổi mật khẩu", ba ô trống, đăng nhập bằng mật khẩu mới được', async () => {
  renderWithProviders(<Gate />);
  await fill('matkhau123', 'matkhau456');
  expect(await screen.findByText('Đã đổi mật khẩu')).toBeInTheDocument();
  expect(screen.getByLabelText('Mật khẩu hiện tại')).toHaveValue('');
  expect(screen.getByLabelText('Mật khẩu mới')).toHaveValue('');
  expect(screen.getByLabelText('Nhập lại mật khẩu mới')).toHaveValue('');
  expect((await adapter.login({ email: 'an@x.vn', password: 'matkhau456' })).token).toBeDefined();
});
it('mật khẩu hiện tại sai: CURRENT_PASSWORD_WRONG_TEXT dưới ô hiện tại, ô mật khẩu mới giữ nguyên', async () => {
  renderWithProviders(<Gate />);
  await fill('sai-mat-khau', 'matkhau456');
  expect(await screen.findByText(CURRENT_PASSWORD_WRONG_TEXT)).toBeInTheDocument();
  expect(screen.getByLabelText('Mật khẩu hiện tại')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText('Mật khẩu mới')).toHaveValue('matkhau456');
});
it('mật khẩu mới trùng hiện tại, quá ngắn hoặc nhập lại lệch → lỗi, không gọi adapter.changePassword', async () => {
  const spy = vi.spyOn(adapter, 'changePassword');
  renderWithProviders(<Gate />);
  await fill('matkhau123', 'matkhau123');
  expect(screen.getByText('Mật khẩu mới phải khác mật khẩu hiện tại')).toBeInTheDocument();
  await userEvent.clear(screen.getByLabelText('Mật khẩu mới'));
  await userEvent.clear(screen.getByLabelText('Nhập lại mật khẩu mới'));
  await userEvent.type(screen.getByLabelText('Mật khẩu mới'), 'abc');
  await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'xyz');
  await userEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
  expect(screen.getByText('Mật khẩu từ 8 đến 128 ký tự')).toBeInTheDocument();
  expect(screen.getByText('Mật khẩu nhập lại không khớp')).toBeInTheDocument();
  expect(spy).not.toHaveBeenCalled();
});
it('mật khẩu hiện tại để trống → lỗi và focus ô hiện tại', async () => {
  renderWithProviders(<Gate />);
  await userEvent.click(await screen.findByRole('button', { name: 'Đổi mật khẩu' }));
  expect(screen.getByText('Nhập mật khẩu hiện tại')).toBeInTheDocument();
  expect(screen.getByLabelText('Mật khẩu hiện tại')).toHaveFocus();
});

it('nhận hook đổi mật khẩu qua prop (dùng cho nhân viên)', async () => {
  const mutate = vi.fn();
  const useFake = () => ({ mutate, isPending: false, isError: false, error: null });
  renderWithProviders(<ChangePasswordForm useMutationHook={useFake} />);
  await userEvent.type(screen.getByLabelText('Mật khẩu hiện tại'), 'matkhau123');
  await userEvent.type(screen.getByLabelText('Mật khẩu mới'), 'matkhau456');
  await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'matkhau456');
  await userEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
  expect(mutate).toHaveBeenCalledWith({ currentPassword: 'matkhau123', newPassword: 'matkhau456' }, expect.any(Object));
});
