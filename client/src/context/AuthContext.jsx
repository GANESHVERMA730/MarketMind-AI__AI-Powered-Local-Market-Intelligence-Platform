import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api, { getApiError } from '../api/http';

const AuthContext = createContext(null);
const TOKEN_KEY = 'marketmind-token';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [sessionError, setSessionError] = useState('');
  const [sessionRevision, setSessionRevision] = useState(0);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      setSessionError('');
      return undefined;
    }

    let active = true;
    setLoading(true);
    setSessionError('');
    api
      .get('/auth/me')
      .then(({ data }) => {
        if (active) setUser(data.data.user);
      })
      .catch((error) => {
        if (active) {
          if (error.response?.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            setToken(null);
            setUser(null);
          } else {
            setSessionError(getApiError(error));
          }
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, sessionRevision]);

  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    };
    window.addEventListener('marketmind:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('marketmind:unauthorized', handleUnauthorized);
  }, []);

  async function authenticate(endpoint, credentials) {
    const { data } = await api.post(`/auth/${endpoint}`, credentials);
    localStorage.setItem(TOKEN_KEY, data.data.token);
    setToken(data.data.token);
    setUser(data.data.user);
    setSessionError('');
    setLoading(false);
    return data.data.user;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setSessionError('');
  }

  function retrySession() {
    setSessionRevision((revision) => revision + 1);
  }

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      sessionError,
      retrySession,
      login: (credentials) => authenticate('login', credentials),
      register: (credentials) => authenticate('register', credentials),
      logout,
    }),
    [token, user, loading, sessionError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
