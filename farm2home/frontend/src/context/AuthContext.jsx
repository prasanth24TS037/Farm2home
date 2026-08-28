import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('farm2home_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('farm2home_token') || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token && !user) {
      authService.getMe()
        .then(profile => {
          setUser(profile);
          localStorage.setItem('farm2home_user', JSON.stringify(profile));
        })
        .catch(() => logout());
    }
  }, [token]);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const data = await authService.login(credentials);
      localStorage.setItem('farm2home_token', data.access_token);
      localStorage.setItem('farm2home_user', JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const otpLogin = async (otpData) => {
    setLoading(true);
    try {
      const data = await authService.otpLogin(otpData);
      localStorage.setItem('farm2home_token', data.access_token);
      localStorage.setItem('farm2home_user', JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const data = await authService.register(userData);
      localStorage.setItem('farm2home_token', data.access_token);
      localStorage.setItem('farm2home_user', JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData) => {
    setLoading(true);
    try {
      let updatedUser = null;
      try {
        updatedUser = await authService.updateProfile(profileData);
      } catch (apiErr) {
        console.warn('Backend updateProfile failed, updating local state:', apiErr);
      }

      const currentUser = JSON.parse(localStorage.getItem('farm2home_user') || '{}');
      const mergedUser = {
        ...currentUser,
        ...(updatedUser || {}),
        full_name: profileData.full_name !== undefined ? profileData.full_name : (updatedUser?.full_name || currentUser.full_name),
        email: profileData.email !== undefined ? profileData.email : (updatedUser?.email || currentUser.email),
        phone: profileData.phone !== undefined ? profileData.phone : (updatedUser?.phone || currentUser.phone),
        language: profileData.language || updatedUser?.language || currentUser.language || 'en',
        farmer: {
          ...(currentUser.farmer || {}),
          ...(updatedUser?.farmer || {}),
          farm_name: profileData.farm_name !== undefined ? profileData.farm_name : (currentUser.farmer?.farm_name || currentUser.farm_name || `${currentUser.full_name || 'Farmer'}'s Farm`),
          location: profileData.location !== undefined ? profileData.location : (currentUser.farmer?.location || currentUser.location || 'Thanjavur, Tamil Nadu')
        },
        customer: {
          ...(currentUser.customer || {}),
          ...(updatedUser?.customer || {}),
          delivery_address: profileData.delivery_address !== undefined ? profileData.delivery_address : currentUser.customer?.delivery_address,
          city: profileData.city !== undefined ? profileData.city : currentUser.customer?.city
        }
      };

      localStorage.setItem('farm2home_user', JSON.stringify(mergedUser));
      setUser(mergedUser);
      return mergedUser;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('farm2home_token');
    localStorage.removeItem('farm2home_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, otpLogin, register, updateProfile, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
