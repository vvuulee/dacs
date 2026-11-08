import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { clearStaffSession } from '../features/staff/session';
import { LocationDisplay, renderWithProviders } from '../test/renderWithProviders';
import { signInStaff } from '../test/staffTestUtils';
import StaffRoute from './StaffRoute';

vi.mock('../api', async () => (await import('../test/mockApi')).mockApiModule());

const renderAt = (route) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/staff/login" element={<div>ĐĂNG NHẬP NV</div>} />
        <Route element={<StaffRoute />}>
          <Route path="/staff/vouchers" element={<div>TRANG VOUCHER</div>} />
        </Route>
      </Routes>
      <LocationDisplay />
    </>,
    { route },
  );

beforeEach(() => { localStorage.clear(); clearStaffSession(); });

it('chưa đăng nhập → /staff/login?returnTo=', async () => {
  renderAt('/staff/vouchers');
  expect(await screen.findByText('ĐĂNG NHẬP NV')).toBeInTheDocument();
  expect(screen.getByTestId('location')).toHaveTextContent('/staff/login?returnTo=%2Fstaff%2Fvouchers');
});
it('đã đăng nhập → vào trang', async () => {
  await signInStaff();
  renderAt('/staff/vouchers');
  expect(await screen.findByText('TRANG VOUCHER')).toBeInTheDocument();
});
