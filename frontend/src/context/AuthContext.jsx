import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { setToken as setApiToken } from '../utils/api';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Handle setting token in both Context state and Axios singleton
  const setToken = useCallback((newToken) => {
    setTokenState(newToken);
    setApiToken(newToken);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore errors on logout
    }
    setToken(null);
    setUser(null);
    navigate('/login');
  }, [navigate, setToken]);

  // Initial load: Attempt silent refresh to restore session
  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await api.post('/auth/refresh');
        setToken(res.data.accessToken);
        
        // Decode token manually or fetch user profile. 
        // For simplicity, our backend /auth/login returns the user object, but refresh only returns token.
        // We'll decode the JWT payload client-side to extract user info.
        const payload = JSON.parse(atob(res.data.accessToken.split('.')[1]));
        setUser({
          id: payload.user_id,
          role: payload.role_name,
          staffId: payload.staff_id,
        });
      } catch (err) {
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, [setToken]);

  // Listen for interceptor events
  useEffect(() => {
    const handleLogout = () => logout();
    const handleRefresh = (e) => {
      setToken(e.detail);
      const payload = JSON.parse(atob(e.detail.split('.')[1]));
      setUser({
        id: payload.user_id,
        role: payload.role_name,
        staffId: payload.staff_id,
      });
    };

    window.addEventListener('auth_logout', handleLogout);
    window.addEventListener('token_refreshed', handleRefresh);

    return () => {
      window.removeEventListener('auth_logout', handleLogout);
      window.removeEventListener('token_refreshed', handleRefresh);
    };
  }, [logout, setToken]);

  // Auto-logout on 15 minutes of inactivity
  useEffect(() => {
    if (!token) return;

    let timeoutId;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      // 15 minutes = 900,000 ms
      timeoutId = setTimeout(() => {
        logout();
      }, 15 * 60 * 1000);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      clearTimeout(timeoutId);
    };
  }, [token, logout]);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    setToken(res.data.accessToken);
    setUser(res.data.user);
    navigate('/');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Loading MLIMS...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
