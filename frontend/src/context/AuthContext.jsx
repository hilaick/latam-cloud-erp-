import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API_BASE = '';  // Same origin — Flask serves both frontend and API

// ── Token storage keys ──
const ACCESS_KEY = 'hermes_access_token';
const REFRESH_KEY = 'hermes_refresh_token';
const USER_KEY = 'hermes_user';

// ── Helper: parse JWT to get expiry ──
function parseJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  const payload = parseJwtPayload(token);
  if (!payload || !payload.exp) return true;
  // Consider token expired 30 seconds before actual expiry (safety margin)
  return (payload.exp * 1000) - Date.now() < 30000;
}

// ── Auth Provider ──
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => sessionStorage.getItem(ACCESS_KEY));
  const [loading, setLoading] = useState(true);

  // Persist tokens
  const saveTokens = useCallback((accessToken, refreshToken, userData) => {
    sessionStorage.setItem(ACCESS_KEY, accessToken);
    sessionStorage.setItem(REFRESH_KEY, refreshToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
  }, []);

  const clearTokens = useCallback(() => {
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Auto-refresh on mount / token change
  useEffect(() => {
    const init = async () => {
      const accessToken = sessionStorage.getItem(ACCESS_KEY);
      const refreshToken = sessionStorage.getItem(REFRESH_KEY);

      if (!accessToken || !refreshToken) {
        setLoading(false);
        return;
      }

      if (!isTokenExpired(accessToken)) {
        // Token still valid
        setLoading(false);
        return;
      }

      // Try refresh
      try {
        const resp = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshToken}`
          }
        });
        if (resp.ok) {
          const data = await resp.json();
          saveTokens(data.access_token, refreshToken, data.user);
        } else {
          clearTokens();
        }
      } catch {
        // Network error — keep existing tokens, let individual calls handle it
      }
      setLoading(false);
    };

    init();
  }, []);

  // Axios-like fetch wrapper that auto-attaches token and handles 401
  const authFetch = useCallback(async (url, options = {}) => {
    const headers = { ...options.headers };

    // Attach access token
    const accessToken = sessionStorage.getItem(ACCESS_KEY);
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Don't set Content-Type for FormData (browser sets it with boundary)
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    let resp = await fetch(url, { ...options, headers });

    // If 401, try refreshing token once
    if (resp.status === 401) {
      const refreshToken = sessionStorage.getItem(REFRESH_KEY);
      if (refreshToken) {
        try {
          const refreshResp = await fetch(`${API_BASE}/api/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${refreshToken}`
            }
          });
          if (refreshResp.ok) {
            const data = await refreshResp.json();
            const storedUser = JSON.parse(sessionStorage.getItem(USER_KEY) || '{}');
            saveTokens(data.access_token, refreshToken, data.user || storedUser);

            // Retry original request with new token
            headers['Authorization'] = `Bearer ${data.access_token}`;
            resp = await fetch(url, { ...options, headers });
          } else {
            clearTokens();
          }
        } catch {
          clearTokens();
        }
      }
    }

    return resp;
  }, []);

  // ── Auth actions ──
  const login = async (email, password) => {
    const resp = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.error || 'Login failed');
    }
    saveTokens(data.access_token, data.refresh_token, data.user);
    return data;
  };

  const logout = async () => {
    try {
      const accessToken = sessionStorage.getItem(ACCESS_KEY);
      if (accessToken) {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
      }
    } catch {
      // Fire and forget
    }
    clearTokens();
  };

  const register = async (userData) => {
    const accessToken = sessionStorage.getItem(ACCESS_KEY);
    const resp = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(userData)
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    return data;
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    register,
    authFetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
