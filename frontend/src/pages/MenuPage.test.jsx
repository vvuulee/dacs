import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { adapter } from '../api';
import { ApiError } from '../api/client';
import { LocationDisplay, renderWithProviders } from '../test/renderWithProviders';
import MenuPage from './MenuPage';

vi.mock('../api', async () => {
  const { createMockAdapter } = await import('../api/adapters/mockAdapter');
  return { adapter: createMockAdapter(0) };
});

const renderMenu = (route) => renderWithProviders(<><MenuPage /><LocationDisplay /></>, { route });
const grid = () => screen.getByRole('region', { name: 'Danh sách món' });
const expectCount = (n) => waitFor(() => expect(within(grid()).getAllByRole('link')).toHaveLength(n));

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

it('hiện đủ 24 món và danh mục', async () => {
  renderMenu('/menu');
  await expectCount(24);
  expect(screen.getByRole('link', { name: 'Trà sữa' })).toBeInTheDocument();
});
it('chọn danh mục đổi ?category= và lọc lưới', async () => {
  renderMenu('/menu');
  await expectCount(24);
  await userEvent.click(await screen.findByRole('link', { name: 'Trà sữa' }));
  expect(screen.getByTestId('location')).toHaveTextContent('/menu?category=tra-sua');
  await expectCount(4);
});
it('chọn danh mục giữ nguyên ?q=', async () => {
  renderMenu('/menu?q=tra');
  await userEvent.click(await screen.findByRole('link', { name: 'Trà sữa' }));
  expect(screen.getByTestId('location')).toHaveTextContent('/menu?q=tra&category=tra-sua');
});
it('?q=ca phe chỉ hiện món khớp (không dấu)', async () => {
  renderMenu('/menu?q=ca%20phe');
  expect(await within(grid()).findByText('Cà phê sữa đá')).toBeInTheDocument();
  expect(within(grid()).queryByText('Trà đào cam sả')).toBeNull();
});
it('không có kết quả hiện EmptyState', async () => {
  renderMenu('/menu?q=zzzz');
  expect(await screen.findByText('Không tìm thấy món nào')).toBeInTheDocument();
});
it('?q=khoảng trắng hiện đủ món', async () => {
  renderMenu('/menu?q=%20%20');
  await expectCount(24);
});
it('món isAvailable=false hiện "Tạm hết"', async () => {
  renderMenu('/menu?category=ca-phe');
  expect(await screen.findByText('Tạm hết')).toBeInTheDocument();
});
it('lỗi tải hiện ErrorState; bấm Thử lại tải lại được', async () => {
  const spy = vi.spyOn(adapter, 'getProducts').mockRejectedValue(new ApiError(500, 'Máy chủ trả lỗi 500'));
  renderMenu('/menu');
  expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent('Máy chủ trả lỗi 500');
  spy.mockRestore();
  await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  await expectCount(24);
});
