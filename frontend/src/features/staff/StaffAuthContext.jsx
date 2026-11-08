import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setStaffUnauthorizedHandler } from '../../api/client';
import * as staffService from '../../services/staffService';
import { isSessionExpired } from '../auth/session';
import { clearStaffSession, readStaffSession, saveStaffSession } from './session';

const StaffAuthContext = createContext(null);

const ANONYMOUS = { status: 'anonymous', staff: null };
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const STAFF_QUERIES = { queryKey: ['staff'] };

// Có phiên còn hạn thì phải hỏi /staff/me nên bắt đầu ở 'loading' để không nháy sang trang đăng nhập.
function initialState() {
  const session = readStaffSession();
  const checking = session !== null && !isSessionExpired(session);
  return { status: checking ? 'loading' : 'anonymous', staff: null };
}

// Giống AuthProvider của khách nhưng dùng phiên riêng; không có đăng ký.
export function StaffAuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState(initialState);

  const expire = useCallback(() => {
    clearStaffSession();
    queryClient.removeQueries(STAFF_QUERIES);
    setState(ANONYMOUS);
  }, [queryClient]);

  useEffect(() => {
    setStaffUnauthorizedHandler(expire);
    return () => setStaffUnauthorizedHandler(null);
  }, [expire]);

  useEffect(() => {
    const session = readStaffSession();
    if (!session) return undefined;
    if (isSessionExpired(session)) {
      clearStaffSession();
      return undefined;
    }
    let cancelled = false;
    staffService.getMe().then(
      (staff) => { if (!cancelled) setState({ status: 'authenticated', staff }); },
      (error) => {
        if (cancelled) return;
        // Lỗi mạng: giữ token để lần tải sau thử lại; chỉ 401/403 mới xoá phiên.
        if (error.status === UNAUTHORIZED || error.status === FORBIDDEN) clearStaffSession();
        setState(ANONYMOUS);
      },
    );
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (credentials) => {
    const { token, expiresAt, staff } = await staffService.login(credentials);
    saveStaffSession({ token, expiresAt });
    queryClient.removeQueries(STAFF_QUERIES);
    setState({ status: 'authenticated', staff });
  }, [queryClient]);

  const logout = useCallback(() => {
    // Gửi yêu cầu thu hồi TRƯỚC khi xoá token (request đọc token ngay khi được gọi).
    staffService.logout().catch((error) => console.warn(`Đăng xuất phía máy chủ thất bại: ${error.name}`));
    clearStaffSession();
    queryClient.removeQueries(STAFF_QUERIES);
    setState(ANONYMOUS);
  }, [queryClient]);

  const value = useMemo(() => ({ ...state, login, logout }), [state, login, logout]);
  return <StaffAuthContext.Provider value={value}>{children}</StaffAuthContext.Provider>;
}

export function useStaffAuth() {
  const context = useContext(StaffAuthContext);
  if (!context) throw new Error('useStaffAuth phải được dùng bên trong StaffAuthProvider');
  return context;
}
