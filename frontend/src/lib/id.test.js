import { webcrypto } from 'node:crypto';
import { newRequestId } from './id';

const UUID4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
afterEach(() => vi.unstubAllGlobals());

it('dùng randomUUID khi có', () => {
  vi.stubGlobal('crypto', { randomUUID: () => 'x-uuid' });
  expect(newRequestId()).toBe('x-uuid');
});
it('không có randomUUID vẫn ra UUID v4 hợp lệ và khác nhau', () => {
  vi.stubGlobal('crypto', { getRandomValues: (a) => webcrypto.getRandomValues(a) });
  const first = newRequestId();
  expect(first).toMatch(UUID4);
  expect(newRequestId()).not.toBe(first);
});
