import { adapter } from '../api';
import { getOffers } from './offerService';

vi.mock('../api', () => ({ adapter: { getOffers: vi.fn() } }));

it('map sang Offer', async () => {
  adapter.getOffers.mockResolvedValue([{ id: 1, title: 'T', code: 'ABC', min_order: 50000, expires_at: null }]);
  expect(await getOffers()).toEqual([{ id: '1', title: 'T', description: '', code: 'ABC', minOrder: 50000, expiresAt: null }]);
});
