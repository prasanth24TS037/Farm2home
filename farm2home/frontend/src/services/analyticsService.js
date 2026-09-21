import api from './api';

export const analyticsService = {
  getFarmerAnalytics: async (range = '30d') => {
    const response = await api.get(`/analytics/farmer?range=${range}`);
    return response.data;
  }
};
