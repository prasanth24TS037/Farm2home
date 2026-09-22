import api from './api';

export const productService = {
  getProducts: async (params = {}) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  getMyProducts: async (includeDeleted = false) => {
    const response = await api.get('/products/my-products', {
      params: { include_deleted: includeDeleted }
    });
    return response.data;
  },

  quickUpdatePrice: async (productId, newPrice) => {
    const response = await api.patch(`/products/${productId}/quick-price`, {
      price_per_unit: parseFloat(newPrice)
    });
    return response.data;
  },

  quickUpdateStock: async (productId, newStock) => {
    const response = await api.patch(`/products/${productId}/quick-stock`, {
      stock_quantity: parseFloat(newStock)
    });
    return response.data;
  },

  quickUpdateImage: async (productId, file) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.patch(`/products/${productId}/quick-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  createProduct: async (productData) => {
    const response = await api.post('/products', productData);
    return response.data;
  },

  getCategories: async () => {
    const response = await api.get('/products/categories');
    return response.data;
  },

  getFarmerStats: async () => {
    const response = await api.get('/orders/farmer-stats');
    return response.data;
  },

  getFarmerOrders: async () => {
    const response = await api.get('/orders/farmer-orders');
    return response.data || [];
  },

  updateFarmerOrderStatus: async (orderId, status) => {
    const response = await api.patch(`/orders/${orderId}/farmer-status`, { status });
    return response.data;
  },

  getWishlist: async () => {
    try {
      const response = await api.get('/wishlist');
      return response.data;
    } catch (err) {
      return { product_ids: [], products: [] };
    }
  },

  addToWishlist: async (productId) => {
    try {
      const response = await api.post(`/wishlist/${productId}`);
      return response.data;
    } catch (err) {
      return { status: 'success', product_id: productId };
    }
  },

  removeFromWishlist: async (productId) => {
    try {
      const response = await api.delete(`/wishlist/${productId}`);
      return response.data;
    } catch (err) {
      return { status: 'success', product_id: productId };
    }
  },

  deleteProduct: async (productId) => {
    const response = await api.delete(`/products/${productId}`);
    return response.data;
  },

  restoreProduct: async (productId) => {
    const response = await api.post(`/products/${productId}/restore`);
    return response.data;
  }
};
