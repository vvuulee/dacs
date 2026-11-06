// Trang http không bảo mật (ví dụ mở bằng IP trong mạng LAN) không có Clipboard API: trả false để UI báo.
export async function copyText(text) {
  if (typeof navigator === 'undefined' || typeof navigator.clipboard?.writeText !== 'function') return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
