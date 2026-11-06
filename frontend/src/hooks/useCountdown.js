import { useEffect, useState } from 'react';

const TICK_MS = 1000;
const SECONDS_PER_MINUTE = 60;

export function formatCountdown(ms) {
  const totalSeconds = Math.ceil(ms / TICK_MS);
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Số ms còn lại tới hạn, cập nhật mỗi giây, tối thiểu 0 (không bao giờ âm).
export function useCountdown(expiresAtIso) {
  const remaining = () => (expiresAtIso ? Math.max(0, Date.parse(expiresAtIso) - Date.now()) : 0);
  const [ms, setMs] = useState(remaining);

  useEffect(() => {
    setMs(remaining());
    if (!expiresAtIso) return undefined;
    const timer = setInterval(() => {
      const left = remaining();
      setMs(left);
      if (left === 0) clearInterval(timer);
    }, TICK_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAtIso]);

  return ms;
}

