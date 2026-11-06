import { act, renderHook } from '@testing-library/react';
import { formatCountdown, useCountdown } from './useCountdown';

const NOW = new Date('2026-10-30T03:00:00.000Z');
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => vi.useRealTimers());
const at = (ms) => new Date(NOW.getTime() + ms).toISOString();

it('giảm mỗi giây và dừng ở 0', () => {
  const { result } = renderHook(() => useCountdown(at(3000)));
  expect(result.current).toBe(3000);
  act(() => vi.advanceTimersByTime(1000));
  expect(result.current).toBe(2000);
  act(() => vi.advanceTimersByTime(2000));
  expect(result.current).toBe(0);
  act(() => vi.advanceTimersByTime(5000));
  expect(result.current).toBe(0);
});
it('hạn đã qua → 0 ngay (không âm)', () => {
  const { result } = renderHook(() => useCountdown(at(-60000)));
  expect(result.current).toBe(0);
});
it('không có hạn → 0', () => expect(renderHook(() => useCountdown(undefined)).result.current).toBe(0));
it('formatCountdown mm:ss, làm tròn lên', () => {
  expect(formatCountdown(300000)).toBe('05:00');
  expect(formatCountdown(299500)).toBe('05:00');
  expect(formatCountdown(59000)).toBe('00:59');
  expect(formatCountdown(0)).toBe('00:00');
});
