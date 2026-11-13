import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { loginApi, getMeApi } from '../api/authApi';
import { setUnauthorizedHandler } from '../api/client';
import { storage } from './storage';

export type Role = 'STUDENT' | 'OPERATOR' | 'DRIVER' | 'TECHNICIAN';

export interface StudentInfo {
  studentCode: string;
  phone: string;
  email: string;
  citizenIdMasked: string;
  address: string | null;
  nickname: string | null;
  verified: boolean;
}

export interface UserResponse {
  id: number;
  username: string;
  role: Role;
  fullName: string;
  status: string;
  student: StudentInfo | null;
}

interface AuthState {
  user: UserResponse | null;
  token: string | null;
  expiresAt: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AUTH_KEY = 'auth';

/** Trang chủ của từng vai trò sau khi đăng nhập. */
export function homePathFor(role: Role): string {
  switch (role) {
    case 'STUDENT': return '/student';
    case 'OPERATOR': return '/rebalance';
    case 'DRIVER': return '/driver';
    case 'TECHNICIAN': return '/technician';
  }
}

const initialState: AuthState = {
  user: null,
  token: null,
  expiresAt: null,
  isLoading: true,
  isAuthenticated: false,
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string, remember: boolean) => Promise<UserResponse>;
  logout: () => void;
  restoreSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function parseJwtExpiry(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp) {
      return new Date(payload.exp * 1000).toISOString();
    }
  } catch {
    // Ignore parsing errors
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  const restoreSession = useCallback(async () => {
    try {
      const stored = storage.get(AUTH_KEY);
      if (!stored) {
        setState({ ...initialState, isLoading: false });
        return;
      }

      const { token, expiresAt, user } = JSON.parse(stored);

      if (expiresAt && new Date(expiresAt) <= new Date()) {
        storage.remove(AUTH_KEY);
        setState({ ...initialState, isLoading: false });
        return;
      }

      // Xác thực lại với backend (mock mode thì lấy từ mock). Chỉ xóa phiên khi server báo 401/403;
      // lỗi mạng thì giữ phiên đã lưu để vẫn dùng được khi mất kết nối thoáng qua.
      try {
        const currentUser = await getMeApi();
        setState({
          user: currentUser,
          token,
          expiresAt,
          isLoading: false,
          isAuthenticated: true,
        });
        return;
      } catch (err: unknown) {
        const status = (err as { status?: number }).status;
        const code = (err as { code?: string }).code;
        if (status === 401 || status === 403 || code === 'TOKEN_INVALID') {
          storage.remove(AUTH_KEY);
          setState({ ...initialState, isLoading: false });
          return;
        }
      }

      setState({
        user,
        token,
        expiresAt,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch {
      setState({ ...initialState, isLoading: false });
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = async (username: string, password: string, remember: boolean): Promise<UserResponse> => {
    const res = await loginApi({ username, password });

    const expiresAt = res.expiresAt || parseJwtExpiry(res.accessToken);
    storage.set(AUTH_KEY, JSON.stringify({ token: res.accessToken, expiresAt, user: res.user }), remember);

    setState({
      user: res.user,
      token: res.accessToken,
      expiresAt,
      isLoading: false,
      isAuthenticated: true,
    });
    return res.user;
  };

  const logout = useCallback(() => {
    storage.remove(AUTH_KEY);
    setState({ ...initialState, isLoading: false });
  }, []);

  // Token hết hạn/không hợp lệ ở bất kỳ request nào thì đăng xuất để guard chuyển về trang đăng nhập.
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}