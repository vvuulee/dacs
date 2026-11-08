import { MOCK_AVAILABILITY_KEY } from '../constants';
import { loadAvailability, setAvailability, withAvailability } from './availabilityStore';

const product = { id: 'bac-xiu', name: 'Bạc xỉu', is_available: true };

beforeEach(() => { localStorage.clear(); vi.spyOn(console, 'warn').mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());

it('chưa ghi đè → giữ is_available gốc, không sửa object gốc', () => {
  expect(withAvailability(product)).toEqual(product);
  setAvailability('bac-xiu', false);
  expect(withAvailability(product).is_available).toBe(false);
  expect(product.is_available).toBe(true);
});
it('bật lại món hết sẵn trong dữ liệu', () => {
  setAvailability('cold-brew', true);
  expect(withAvailability({ id: 'cold-brew', is_available: false }).is_available).toBe(true);
  expect(loadAvailability()).toEqual({ 'cold-brew': true });
});
it('JSON hỏng → {} và warn', () => {
  localStorage.setItem(MOCK_AVAILABILITY_KEY, '[1,2');
  expect(loadAvailability()).toEqual({});
  expect(console.warn).toHaveBeenCalled();
});
