import api from './api';

export const orderService = {
  createOrder: async (orderData) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  getOrder: async (orderId) => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  },

  getMyOrders: async () => {
    const response = await api.get('/orders/my-orders');
    return response.data;
  },

  getFarmerOrders: async () => {
    const response = await api.get('/orders/farmer-orders');
    return response.data;
  },

  getFarmerStats: async () => {
    const response = await api.get('/orders/farmer-stats');
    return response.data;
  },

  updateFarmerOrderStatus: async (orderId, status) => {
    const response = await api.patch(`/orders/${orderId}/farmer-status`, { status });
    return response.data;
  }
};
