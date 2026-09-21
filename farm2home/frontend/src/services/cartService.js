import api from './api';

export const cartService = {
  getCart: async () => {
    const response = await api.get('/cart');
    return response.data;
  },

  addToCart: async (productId, quantity = 1) => {
    const response = await api.post('/cart', {
      product_id: productId,
      quantity: parseFloat(quantity)
    });
    return response.data;
  },

  updateCartItem: async (itemId, quantity) => {
    const response = await api.patch(`/cart/${itemId}`, {
      quantity: parseFloat(quantity)
    });
    return response.data;
  },

  removeCartItem: async (itemId) => {
    const response = await api.delete(`/cart/${itemId}`);
    return response.data;
  },

  clearCart: async () => {
    const response = await api.delete('/cart');
    return response.data;
  }
};
