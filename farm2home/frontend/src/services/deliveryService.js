import api from './api';

export const deliveryService = {
  getDashboard: async () => {
    const response = await api.get('/delivery/dashboard');
    return response.data;
  },

  toggleDuty: async (isOnDuty) => {
    const response = await api.post('/delivery/toggle-duty', { is_on_duty: isOnDuty });
    return response.data;
  },

  updateStatus: async (orderId, status) => {
    const response = await api.post(`/delivery/orders/${orderId}/update-status`, { status });
    return response.data;
  }
};

export const adminService = {
  getOverview: async () => {
    const response = await api.get('/admin/overview');
    return response.data;
  },

  getUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  }
};
