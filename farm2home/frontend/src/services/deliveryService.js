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
  
  updateAvailability: async (isOnDuty) => {
    const response = await api.patch('/delivery/availability', { is_on_duty: isOnDuty });
    return response.data;
  },

  updateStatus: async (orderId, status, proofUrl = null, otp = null) => {
    const payload = { status };
    if (proofUrl) payload.proof_url = proofUrl;
    if (otp) payload.otp = otp;
    const response = await api.post(`/delivery/orders/${orderId}/update-status`, payload);
    return response.data;
  },
  
  rejectDelivery: async (orderId) => {
    const response = await api.post(`/delivery/orders/${orderId}/reject`);
    return response.data;
  },

  getRoute: async () => {
    const response = await api.get('/delivery/route');
    return response.data;
  },

  getHistory: async (page = 1, status = '') => {
    let url = `/delivery/history?page=${page}`;
    if (status) url += `&status=${status}`;
    const response = await api.get(url);
    return response.data;
  },
  
  getEarnings: async () => {
    const response = await api.get('/delivery/earnings');
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
