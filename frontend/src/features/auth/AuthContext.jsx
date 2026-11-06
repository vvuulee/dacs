import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setUnauthorizedHandler } from '../../api/client';
import * as authService from '../../services/authService';
import { clearSession, isSessionExpired, readSession, saveSession } from './session';

const AuthContext = createContext(null);

const ANONYMOUS = { status: 'anonymous', user: null };
const UNAUTHORIZED = 401;

// Có phiên còn hạn thì phải hỏi /me nên bắt đầu ở 'loading' để trang không nháy sang đăng nhập.
function initialState() {
  const session = readSession();
  const checking = session !== null && !isSessionExpired(session);
  return { status: checking ? 'loading' : 'anonymous', user: null, sessionExpired: false };
}

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState(initialState);

  // 401 trên request có token: phiên hết hạn hoặc bị thu hồi.
  const expire = useCallback(() => {
    clearSession();
    queryClient.removeQueries();
    setState({ ...ANONYMOUS, sessionExpired: true });
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(expire);
    return () => setUnauthorizedHandler(null);
  }, [expire]);

  useEffect(() => {
    const session = readSession();
    if (!session) return undefined;
    if (isSessionExpired(session)) {
      clearSession();
      return undefined;
    }
    let cancelled = false;
    authService.getMe().then(
      (user) => { if (!cancelled) setState({ status: 'authenticated', user, sessionExpired: false }); },
      (error) => {
        if (cancelled) return;
        // Lỗi mạng: giữ token để lần tải sau thử lại; chỉ 401 mới xóa phiên.
        if (error.status === UNAUTHORIZED) clearSession();
        setState((current) => ({ ...current, ...ANONYMOUS }));
      },
    );
    return () => { cancelled = true; };
  }, []);

  const startSession = useCallback(({ token, expiresAt, user }) => {
    saveSession({ token, expiresAt });
    queryClient.removeQueries();
    setState({ status: 'authenticated', user, sessionExpired: false });
  }, [queryClient]);

  const login = useCallback(async (credentials) => startSession(await authService.login(credentials)), [startSession]);
  const register = useCallback(async (details) => startSession(await authService.register(details)), [startSession]);

  const logout = useCallback(async () => {
    // Bắt đầu yêu cầu thu hồi phiên TRƯỚC khi xóa token (request đọc token ngay khi được gọi).
    authService.logout().catch((error) => {
      console.warn(`Đăng xuất phía máy chủ thất bại: ${error.name}`);
    });
    clearSession();
    queryClient.removeQueries();
    setState((current) => ({ ...current, ...ANONYMOUS }));
  }, [queryClient]);

  const setUser = useCallback((user) => setState((current) => ({ ...current, user })), []);
  const dismissExpired = useCallback(() => setState((current) => ({ ...current, sessionExpired: false })), []);

  const value = useMemo(
    () => ({ ...state, login, register, logout, setUser, dismissExpired }),
    [state, login, register, logout, setUser, dismissExpired],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth phải được dùng bên trong AuthProvider');
  return context;
}
