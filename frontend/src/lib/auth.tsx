import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from '../api/client';
import type { Role, TokenResponse, UserView } from '../api/types';

interface AuthState {
  user: UserView | null;
  ready: boolean;
  login: (username: string, password: string, portal: 'STUDENT' | 'INTERNAL') => Promise<TokenResponse>;
  switchContext: (role: Role) => Promise<UserView>;
  logout: () => void;
}

const Ctx = createContext<AuthState | null>(null);
const USER_KEY = 'unigo.user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserView | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw && tokenStore.get() ? (JSON.parse(raw) as UserView) : null;
  });
  const [ready, setReady] = useState(false);

  const apply = useCallback((t: TokenResponse) => {
    tokenStore.set(t.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(t.user));
    setUser(t.user);
  }, []);

  const logout = useCallback(() => {
    tokenStore.set(null);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) { setReady(true); return; }
    api<UserView>('/api/v1/auth/me')
      .then((u) => { setUser(u); localStorage.setItem(USER_KEY, JSON.stringify(u)); })
      .catch(() => logout())
      .finally(() => setReady(true));
  }, [logout]);

  const value = useMemo<AuthState>(() => ({
    user, ready, logout,
    login: async (username, password, portal) => {
      const t = await api<TokenResponse>('/api/v1/auth/login', { body: { username, password, portal } });
      apply(t);
      return t;
    },
    // Góp ý #2: chỉ chọn ngữ cảnh trong các vai trò đã được cấp; server kiểm tra lại quyền
    switchContext: async (role) => {
      const t = await api<TokenResponse>('/api/v1/auth/context', { body: { role } });
      apply(t);
      return t.user;
    },
  }), [user, ready, logout, apply]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('AuthProvider missing');
  return c;
}

export const homeFor = (role: Role | undefined) =>
  role === 'OPERATOR' ? '/ops' : role === 'DRIVER' ? '/driver' : role === 'TECHNICIAN' ? '/tech' : '/';

export const roleLabel: Record<Role, string> = { STUDENT: 'Sinh viên', OPERATOR: 'Đơn vị vận hành', DRIVER: 'Tài xế điều chuyển', TECHNICIAN: 'Kỹ thuật viên' };
