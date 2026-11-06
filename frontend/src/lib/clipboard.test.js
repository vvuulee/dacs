import { copyText } from './clipboard';

afterEach(() => vi.unstubAllGlobals());

it('có clipboard → gọi writeText với đúng chuỗi và trả true', async () => {
  const writeText = vi.fn().mockResolvedValue();
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  expect(await copyText('CHAO10')).toBe(true);
  expect(writeText).toHaveBeenCalledWith('CHAO10');
});
it('không có clipboard (trang http không bảo mật) → false', async () => {
  vi.stubGlobal('navigator', {});
  expect(await copyText('X')).toBe(false);
});
it('writeText bị từ chối → false, không ném', async () => {
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
  expect(await copyText('X')).toBe(false);
});
