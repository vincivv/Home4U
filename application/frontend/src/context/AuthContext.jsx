import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const validateToken = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const me = await response.json();
          if (!cancelled) {
            setUser(me);
          }
          return;
        }

        // Token is invalid/expired: clear auth state.
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('access_token');
          if (!cancelled) {
            setToken(null);
            setUser(null);
          }
          return;
        }

        // Non-auth backend issues should not force logout.
        if (!cancelled) {
          setUser({ token });
        }
      } catch {
        // Temporary connectivity issues should not force logout.
        if (!cancelled) {
          setUser({ token });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    setLoading(true);
    validateToken();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = (token) => {
    localStorage.setItem('access_token', token);
    setToken(token);
    setUser({ token });
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- hook paired with provider
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
