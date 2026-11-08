import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { adapter } from '../../api';
import App from '../../App';
import { STAFF_DEMO } from '../../mocks/staffStore';
import { LocationDisplay, renderWithProviders } from '../../test/renderWithProviders';
import { signInStaff } from '../../test/staffTestUtils';

vi.mock('../../api', async () => (await import('../../test/mockApi')).mockApiModule());

async function openPage() {
  await signInStaff();
  renderWithProviders(<><App /><LocationDisplay /></>, { route: '/staff/account' });
  await screen.findByRole('heading', { name: 'Tài khoản' });
}

beforeEach(() => localStorage.clear());

it('hiện tên, email, vai trò', async () => {
  await openPage();
  const profile = screen.getByRole('region', { name: 'Hồ sơ nhân viên' });
  expect(profile).toHaveTextContent('Nhân viên Mẫu');
  expect(profile).toHaveTextContent(STAFF_DEMO.email);
  expect(profile).toHaveTextContent('Nhân viên');
});
it('đổi mật khẩu qua API nhân viên', async () => {
  await openPage();
  await userEvent.type(screen.getByLabelText('Mật khẩu hiện tại'), STAFF_DEMO.password);
  await userEvent.type(screen.getByLabelText('Mật khẩu mới'), 'moi12345');
  await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'moi12345');
  await userEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
  expect(await screen.findByText('Đã đổi mật khẩu')).toBeInTheDocument();
  expect((await adapter.staffLogin({ email: STAFF_DEMO.email, password: 'moi12345' })).token).toBeDefined();
});
it('đăng xuất → về trang đăng nhập nhân viên', async () => {
  await openPage();
  await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất khỏi tài khoản' }));
  expect(await screen.findByRole('heading', { name: 'Đăng nhập nhân viên' })).toBeInTheDocument();
  expect(screen.getByTestId('location')).toHaveTextContent(/^\/staff\/login/);
});
