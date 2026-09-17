import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [owner, setOwner] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage
    const savedToken = localStorage.getItem('kirana_owner_token');
    const savedUser = localStorage.getItem('kirana_owner_user');

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser && parsedUser.role === 'admin') {
          setOwner(parsedUser);
          setToken(savedToken);
        } else {
          localStorage.removeItem('kirana_owner_token');
          localStorage.removeItem('kirana_owner_user');
        }
      } catch (e) {
        localStorage.removeItem('kirana_owner_token');
        localStorage.removeItem('kirana_owner_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (identifier, password) => {
    try {
      const res = await api.post('/auth/login', { identifier, password });
      if (res.data.success) {
        const { user, token } = res.data;

        // Verify role is admin
        if (user.role !== 'admin') {
          throw new Error('Access denied: You do not have owner/admin privileges to access this portal.');
        }

        setOwner(user);
        setToken(token);
        localStorage.setItem('kirana_owner_token', token);
        localStorage.setItem('kirana_owner_user', JSON.stringify(user));
        return { success: true, user };
      } else {
        throw new Error(res.data.message || 'Login failed');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Invalid email or password';
      throw new Error(msg);
    }
  };

  const logout = () => {
    setOwner(null);
    setToken(null);
    localStorage.removeItem('kirana_owner_token');
    localStorage.removeItem('kirana_owner_user');
  };

  const updateProfile = async (formData) => {
    try {
      const res = await api.put('/auth/profile', formData);
      if (res.data.success) {
        setOwner(res.data.user);
        localStorage.setItem('kirana_owner_user', JSON.stringify(res.data.user));
        return { success: true, user: res.data.user };
      }
      throw new Error(res.data.message || 'Failed to update profile');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update profile';
      throw new Error(msg);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        owner,
        token,
        isAuthenticated: !!token && owner?.role === 'admin',
        loading,
        login,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
