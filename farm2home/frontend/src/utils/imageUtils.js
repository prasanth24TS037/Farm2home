const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://farm2home-backend-4ar0.onrender.com').replace(/\/$/, '');

export const DEFAULT_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80';

export const getImageUrl = (url) => {
  if (!url) return DEFAULT_PRODUCT_IMAGE;
  if (url.startsWith('/static/')) {
    return `${API_BASE_URL}${url}`;
  }
  return url;
};
