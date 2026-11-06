import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { adapter } from '../api';
import { ApiError } from '../api/client';
import { NO_OFFERS_TEXT } from '../features/vouchers/messages';
import { renderWithProviders } from '../test/renderWithProviders';
import OffersPage from './OffersPage';

vi.mock('../api', async () => {
  const { createMockAdapter } = await import('../api/adapters/mockAdapter');
  return { adapter: createMockAdapter(0) };
});

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

it('hiện 4 ưu đãi của mock, không có HETHAN', async () => {
  renderWithProviders(<OffersPage />);
  expect(await screen.findByText('CHAO10')).toBeInTheDocument();
  const region = screen.getByRole('region', { name: 'Danh sách ưu đãi' });
  expect(within(region).getAllByRole('heading', { level: 2 })).toHaveLength(4);
  for (const code of ['CHAO10', 'GIAM20K', 'FREESHIP', 'COMBO15']) expect(screen.getByText(code)).toBeInTheDocument();
  expect(screen.queryByText('HETHAN')).toBeNull();
});
it('rỗng → NO_OFFERS_TEXT', async () => {
  vi.spyOn(adapter, 'getOffers').mockResolvedValue([]);
  renderWithProviders(<OffersPage />);
  expect(await screen.findByText(NO_OFFERS_TEXT)).toBeInTheDocument();
});
it('lỗi tải → ErrorState; Thử lại tải lại được', async () => {
  const spy = vi.spyOn(adapter, 'getOffers').mockRejectedValue(new ApiError(500, 'Máy chủ trả lỗi 500'));
  renderWithProviders(<OffersPage />);
  expect(await screen.findByRole('alert', {}, { timeout: 3000 })).toHaveTextContent('Máy chủ trả lỗi 500');
  spy.mockRestore();
  await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByText('CHAO10')).toBeInTheDocument();
});
