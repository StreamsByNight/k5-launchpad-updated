import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { completeOAuth, getAuthStatus, getLoginUrl, logout as apiLogout, type AuthStatus } from '../api/client';

interface AuthContextValue extends AuthStatus {
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  handleCallback: (code: string, state: string | null) => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>({
    authenticated: false,
    oauthConfigured: false,
    userName: null,
    canvasBaseUrl: null,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const s = await getAuthStatus();
      setStatus(s);
    } catch {
      setStatus({
        authenticated: false,
        oauthConfigured: false,
        userName: null,
        canvasBaseUrl: null,
      });
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = async () => {
    const url = await getLoginUrl();
    window.location.href = url;
  };

  const logout = async () => {
    await apiLogout();
    await refresh();
  };

  const handleCallback = async (code: string, state: string | null) => {
    await completeOAuth(code, state);
    await refresh();
  };

  return (
    <AuthContext.Provider value={{ ...status, loading, login, logout, handleCallback, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
