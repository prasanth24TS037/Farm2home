import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://farm2home-backend-4ar0.onrender.com').replace(/\/$/, '');

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('farm2home_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global response error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired or unauthorized
      if (!window.location.pathname.startsWith('/login')) {
        // Only redirect if not already on login
      }
    }
    return Promise.reject(error);
  }
);

export default api;
