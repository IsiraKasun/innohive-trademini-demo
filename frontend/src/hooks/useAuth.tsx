import React, { createContext, useContext, useMemo, useState } from 'react';
import { closeSharedWebSocket } from './useWebSocket';

interface AuthContextValue {
  token: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  login: (token: string, username: string, firstName: string, lastName: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem('username'));
  const [firstName, setFirstName] = useState<string | null>(() => localStorage.getItem('firstName'));
  const [lastName, setLastName] = useState<string | null>(() => localStorage.getItem('lastName'));

  const login = (t: string, u: string, f: string, l: string) => {
    setToken(t);
    setUsername(u);
    setFirstName(f);
    setLastName(l);
    localStorage.setItem('token', t);
    localStorage.setItem('username', u);
    localStorage.setItem('firstName', f);
    localStorage.setItem('lastName', l);
  };

  const logout = () => {
    setToken(null);
    setUsername(null);
    setFirstName(null);
    setLastName(null);
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('firstName');
    localStorage.removeItem('lastName');
    closeSharedWebSocket();

  };

  const value = useMemo(
    () => ({ token, username, firstName, lastName, login, logout }),
    [token, username, firstName, lastName]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
