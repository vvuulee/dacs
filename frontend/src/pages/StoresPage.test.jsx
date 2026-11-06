import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { adapter } from '../api';
import { ApiError } from '../api/client';
import { NO_STORES_TEXT } from '../features/vouchers/messages';
import { LocationDisplay, renderWithProviders } from '../test/renderWithProviders';
import StoresPage from './StoresPage';

vi.mock('../api', async () => {
  const { createMockAdapter } = await import('../api/adapters/mockAdapter');
  return { adapter: createMockAdapter(0) };
});

const renderStores = (route = '/stores') => renderWithProviders(<><StoresPage /><LocationDisplay /></>, { route });
const region = () => screen.getByRole('region', { name: 'Danh sách cửa hàng' });
const cards = () => within(region()).queryAllByRole('heading', { level: 2 });
const expectCount = (n) => waitFor(() => expect(cards()).toHaveLength(n));

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

it('hiện đủ 9 cửa hàng', async () => {
  renderStores();
  await expectCount(9);
});
it('?province=hn chỉ hiện 3 cửa hàng của Hà Nội và ô chọn đang ở "Hà Nội"', async () => {
  renderStores('/stores?province=hn');
  await expectCount(3);
  await waitFor(() => expect(screen.getByLabelText('Tỉnh/Thành')).toHaveValue('hn'));
});
it('chọn tỉnh đổi ?province= và lọc', async () => {
  renderStores();
  await expectCount(9);
  await screen.findByRole('option', { name: 'Đà Nẵng' });
  await userEvent.selectOptions(screen.getByLabelText('Tỉnh/Thành'), 'dn');
  expect(screen.getByTestId('location')).toHaveTextContent(/^\/stores\?province=dn$/);
  await expectCount(3);
});
it('chọn lại "Tất cả" bỏ ?province=', async () => {
  renderStores('/stores?province=hn');
  await screen.findByRole('option', { name: 'Đà Nẵng' });
  await userEvent.selectOptions(screen.getByLabelText('Tỉnh/Thành'), '');
  expect(screen.getByTestId('location')).toHaveTextContent(/^\/stores$/);
  await expectCount(9);
});
it('gõ "mau 2" (không dấu) sau debounce đổi ?q= và giữ ?province=', async () => {
  renderStores('/stores?province=hn');
  await expectCount(3);
  await userEvent.type(screen.getByLabelText('Tìm cửa hàng'), 'mau 2');
  expect(screen.getByTestId('location')).toHaveTextContent(/^\/stores\?province=hn$/); // chưa debounce xong
  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/stores\?province=hn&q=mau\+2$/));
  await waitFor(() => expect(cards().map((h) => h.textContent)).toEqual(['Cửa hàng Mẫu 2']));
});
it('không có kết quả → NO_STORES_TEXT', async () => {
  renderStores('/stores?q=zzzz');
  expect(await screen.findByText(NO_STORES_TEXT)).toBeInTheDocument();
});
it('đang tải: vùng danh sách aria-busy', () => {
  renderStores();
  expect(region()).toHaveAttribute('aria-busy', 'true');
});
it('lỗi tải → ErrorState; Thử lại tải lại được', async () => {
  const spy = vi.spyOn(adapter, 'getStores').mockRejectedValue(new ApiError(500, 'Máy chủ trả lỗi 500'));
  renderStores();
  expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent('Máy chủ trả lỗi 500');
  spy.mockRestore();
  await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  await expectCount(9);
});
