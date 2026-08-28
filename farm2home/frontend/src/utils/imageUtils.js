export const DEFAULT_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80';

export const getImageUrl = (url) => {
  if (!url) return DEFAULT_PRODUCT_IMAGE;
  if (url.startsWith('/static/')) {
    return `http://127.0.0.1:8000${url}`;
  }
  return url;
};
