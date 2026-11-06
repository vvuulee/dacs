import { QueryClient } from '@tanstack/react-query';

const MAX_RETRIES = 1;
const NOT_FOUND = 404;

// 404 là kết quả hợp lệ ("món không tồn tại"), thử lại chỉ tốn thời gian.
const shouldRetry = (failureCount, error) => error?.status !== NOT_FOUND && failureCount < MAX_RETRIES;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: shouldRetry, refetchOnWindowFocus: false } },
  });
}
