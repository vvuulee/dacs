import { act, renderHook } from '@testing-library/react';
import { useDebouncedValue } from './useDebouncedValue';

afterEach(() => vi.useRealTimers());

it('giá trị chỉ đổi sau ms', () => {
  vi.useFakeTimers();
  const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), { initialProps: { v: 'a' } });
  rerender({ v: 'ab' });
  act(() => vi.advanceTimersByTime(299));
  expect(result.current).toBe('a');
  act(() => vi.advanceTimersByTime(1));
  expect(result.current).toBe('ab');
});
