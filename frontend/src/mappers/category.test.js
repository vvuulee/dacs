import { toCategory, toCategories } from './category';

it('map category', () =>
  expect(toCategory({ id: 3, name: 'Trà', image: 'a.png' })).toEqual({ id: '3', name: 'Trà', image: 'a.png' }));
it('thiếu image → ""', () => expect(toCategory({ id: 'a', name: 'B' }).image).toBe(''));
it('thiếu name ném lỗi nêu "name"', () => expect(() => toCategory({ id: 'a' })).toThrow(/name/));
it('toCategories bỏ phần tử hỏng và warn', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  expect(toCategories([{ id: 'a', name: 'B' }, {}])).toHaveLength(1);
  expect(warn).toHaveBeenCalledOnce();
  warn.mockRestore();
});
