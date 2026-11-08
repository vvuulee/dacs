import { act, screen } from '@testing-library/react';
import { adapter } from '../../api';
import { notifyStaffUnauthorized } from '../../api/client';
import { readSession, saveSession } from '../auth/session';
import { renderWithProviders } from '../../test/renderWithProviders';
import { signInStaff } from '../../test/staffTestUtils';
import { readStaffSession } from './session';
import { useStaffAuth } from './StaffAuthContext';

vi.mock('../../api', async () => (await import('../../test/mockApi')).mockApiModule());

function Probe() {
  const { status, staff } = useStaffAuth();
  return <div data-testid="probe">{status}:{staff?.name ?? '-'}</div>;
}

beforeEach(() => localStorage.clear());

it('không có phiên → anonymous', () => {
  renderWithProviders(<Probe />);
  expect(screen.getByTestId('probe')).toHaveTextContent('anonymous:-');
});
it('có phiên → loading rồi authenticated với tên nhân viên', async () => {
  await signInStaff();
  renderWithProviders(<Probe />);
  expect(screen.getByTestId('probe')).toHaveTextContent('loading');
  expect(await screen.findByText('authenticated:Nhân viên Mẫu')).toBeInTheDocument();
});
it('401 phía nhân viên → anonymous, xoá phiên nhân viên, giữ phiên khách', async () => {
  const customer = await adapter.register({ name: 'An', email: 'an@x.vn', password: 'matkhau123' });
  saveSession({ token: customer.token, expiresAt: customer.expires_at });
  await signInStaff();
  renderWithProviders(<Probe />);
  await screen.findByText('authenticated:Nhân viên Mẫu');
  act(() => notifyStaffUnauthorized());
  expect(screen.getByTestId('probe')).toHaveTextContent('anonymous');
  expect(readStaffSession()).toBeNull();
  expect(readSession().token).toBe(customer.token);
});
