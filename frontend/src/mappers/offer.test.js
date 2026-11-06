import { toOffer, toOffers } from './offer';

afterEach(() => vi.restoreAllMocks());

it('toOffer: min_order/expires_at null hoặc thiếu → null, description mặc định ""', () =>
  expect(toOffer({ id: 1, title: 'T', code: 'ABC', min_order: null })).toEqual({
    id: '1', title: 'T', description: '', code: 'ABC', minOrder: null, expiresAt: null,
  }));
it('toOffer có giá trị thì map', () =>
  expect(toOffer({ id: 1, title: 'T', description: 'Mô tả', code: 'ABC', min_order: 50000, expires_at: '2099-01-01T00:00:00.000Z' }))
    .toMatchObject({ description: 'Mô tả', minOrder: 50000, expiresAt: '2099-01-01T00:00:00.000Z' }));
it.each(['id', 'title', 'code'])('toOffer thiếu %s ném lỗi nêu tên', (field) =>
  expect(() => toOffer({ id: 1, title: 'T', code: 'ABC', [field]: undefined })).toThrow(new RegExp(field)));
it('toOffer min_order âm ném lỗi nêu min_order', () =>
  expect(() => toOffer({ id: 1, title: 'T', code: 'ABC', min_order: -1 })).toThrow(/min_order/));
it('toOffers bỏ phần tử hỏng và warn', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  expect(toOffers([{ id: 1, title: 'T', code: 'ABC' }, { id: 2 }])).toHaveLength(1);
  expect(warn).toHaveBeenCalledOnce();
});
