import { createContext, useContext, useState, useEffect } from 'react';
import { setUnauthorizedHandler } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('cafehub_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('cafehub_token') || null);

  function login(userData, jwt) {
    setUser(userData);
    setToken(jwt);
    localStorage.setItem('cafehub_user', JSON.stringify(userData));
    localStorage.setItem('cafehub_token', jwt);
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('cafehub_user');
    localStorage.removeItem('cafehub_token');
  }

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
