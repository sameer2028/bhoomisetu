import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const ROLE_LABELS = {
  DLAO: 'District Land Acquisition Officer',
  PIA: 'Project Implementing Agency',
  SGA: 'Senior Government Authority',
  FRO: 'Field / Revenue Officer',
  ADMIN: 'System Administrator',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('nla_user');
    const token = localStorage.getItem('nla_token');
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('nla_user');
        localStorage.removeItem('nla_token');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user: userData } = res.data.data;
    localStorage.setItem('nla_token', token);
    localStorage.setItem('nla_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('nla_token');
    localStorage.removeItem('nla_user');
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    roleLabel: user ? ROLE_LABELS[user.role] || user.role : '',
    hasRole: (...roles) => user && roles.includes(user.role),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
