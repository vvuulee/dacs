import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { adapter } from '../../api';
import { ApiError } from '../../api/client';
import App from '../../App';
import { renderWithProviders } from '../../test/renderWithProviders';
import { signInStaff } from '../../test/staffTestUtils';

vi.mock('../../api', async () => (await import('../../test/mockApi')).mockApiModule());

const toggle = (name) => screen.findByRole('switch', { name: `Còn hàng: ${name}` });
async function openPage() {
  await signInStaff();
  renderWithProviders(<App />, { route: '/staff/inventory' });
  await screen.findByRole('heading', { name: 'Tồn kho' });
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

it('món hết sẵn hiện tắt; tắt Bạc xỉu thì khách thấy hết hàng', async () => {
  await openPage();
  expect(await toggle('Cold brew cam sả')).toHaveAttribute('aria-checked', 'false');
  const sw = await toggle('Bạc xỉu');
  expect(sw).toHaveAttribute('aria-checked', 'true');
  await userEvent.click(sw);
  await vi.waitFor(() => expect(sw).toHaveAttribute('aria-checked', 'false'));
  expect((await adapter.getProducts()).find((p) => p.id === 'bac-xiu').is_available).toBe(false);
});
it('lỗi khi cập nhật → trả công tắc về như cũ và báo lỗi', async () => {
  await openPage();
  vi.spyOn(adapter, 'staffSetAvailability').mockRejectedValueOnce(new ApiError(500, 'Máy chủ lỗi'));
  const sw = await toggle('Bạc xỉu');
  await userEvent.click(sw);
  expect(await screen.findByRole('alert')).toHaveTextContent('Không cập nhật được Bạc xỉu');
  expect(sw).toHaveAttribute('aria-checked', 'true');
});
it('tìm không dấu và lọc danh mục', async () => {
  await openPage();
  await toggle('Bạc xỉu');
  await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm món' }), 'bac');
  expect(screen.getByRole('switch', { name: 'Còn hàng: Bạc xỉu' })).toBeInTheDocument();
  expect(screen.queryByRole('switch', { name: 'Còn hàng: Trà đào cam sả' })).not.toBeInTheDocument();
  await userEvent.clear(screen.getByRole('searchbox', { name: 'Tìm món' }));
  await userEvent.click(within(screen.getByRole('group', { name: 'Danh mục' })).getByRole('button', { name: 'Trà trái cây' }));
  expect(screen.queryByRole('switch', { name: 'Còn hàng: Bạc xỉu' })).not.toBeInTheDocument();
  expect(screen.getByRole('switch', { name: 'Còn hàng: Trà đào cam sả' })).toBeInTheDocument();
});

it('bấm hai món liên tiếp: lỗi của món đầu vẫn trả công tắc về và báo lỗi', async () => {
  await openPage();
  const real = adapter.staffSetAvailability.bind(adapter);
  let failFirst;
  vi.spyOn(adapter, 'staffSetAvailability')
    .mockImplementationOnce(() => new Promise((_, reject) => { failFirst = () => reject(new ApiError(500, 'Máy chủ lỗi')); }))
    .mockImplementation(real);
  const a = await toggle('Bạc xỉu');
  const b = await toggle('Cà phê đen đá');
  await userEvent.click(a);
  await userEvent.click(b);
  await vi.waitFor(() => expect(b).toHaveAttribute('aria-checked', 'false'));
  await vi.waitFor(() => expect(b).not.toBeDisabled());
  failFirst();
  expect(await screen.findByRole('alert')).toHaveTextContent('Không cập nhật được Bạc xỉu');
  await vi.waitFor(() => expect(a).toHaveAttribute('aria-checked', 'true'));
  expect(a).not.toBeDisabled();
});
