import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { STAFF_DEMO } from '../../mocks/staffStore';
import { LocationDisplay, renderWithProviders } from '../../test/renderWithProviders';
import { signInStaff } from '../../test/staffTestUtils';
import StaffLoginPage from './StaffLoginPage';

vi.mock('../../api', async () => (await import('../../test/mockApi')).mockApiModule());

const renderLogin = (route = '/staff/login') =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/staff/login" element={<StaffLoginPage />} />
        <Route path="*" element={<div>TRANG ĐÍCH</div>} />
      </Routes>
      <LocationDisplay />
    </>,
    { route },
  );
const location = () => screen.getByTestId('location');
async function fill(password = STAFF_DEMO.password) {
  await userEvent.type(screen.getByLabelText('Email'), STAFF_DEMO.email);
  await userEvent.type(screen.getByLabelText('Mật khẩu'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
}

beforeEach(() => localStorage.clear());

it('đăng nhập đúng → vào returnTo', async () => {
  renderLogin('/staff/login?returnTo=%2Fstaff%2Forders');
  await fill();
  await screen.findByText('TRANG ĐÍCH');
  expect(location()).toHaveTextContent('/staff/orders');
});
it('sai mật khẩu → thông báo lỗi', async () => {
  renderLogin();
  await fill('sai-mat-khau');
  expect(await screen.findByRole('alert')).toHaveTextContent('Email hoặc mật khẩu không đúng');
});
it('returnTo ngoài /staff → về /staff', async () => {
  renderLogin('/staff/login?returnTo=%2Faccount');
  await fill();
  await screen.findByText('TRANG ĐÍCH');
  expect(location()).toHaveTextContent(/^\/staff$/);
});
it('đã đăng nhập mà mở trang đăng nhập → về /staff', async () => {
  await signInStaff();
  renderLogin();
  await screen.findByText('TRANG ĐÍCH');
  expect(location()).toHaveTextContent(/^\/staff$/);
});
it('bỏ trống → báo lỗi tại ô, không gọi đăng nhập', async () => {
  renderLogin();
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
  expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
});
