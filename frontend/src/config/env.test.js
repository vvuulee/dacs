import { readEnv } from './env';

it('mặc định là mock', () => expect(readEnv({}).apiMode).toBe('mock'));
it('nhận http kèm base url', () =>
  expect(readEnv({ VITE_API_MODE: 'http', VITE_API_BASE_URL: 'https://api.x/v1' })).toEqual({
    apiMode: 'http',
    apiBaseUrl: 'https://api.x/v1',
  }));
it('mode lạ ném lỗi nêu giá trị', () =>
  expect(() => readEnv({ VITE_API_MODE: 'foo' })).toThrow(/foo/));
it('http thiếu base url ném lỗi', () =>
  expect(() => readEnv({ VITE_API_MODE: 'http' })).toThrow(/VITE_API_BASE_URL/));
