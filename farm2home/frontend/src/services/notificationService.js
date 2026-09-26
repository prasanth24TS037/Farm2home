import api from './api';

export const notificationService = {
  getNotifications: async (page = 1, limit = 20, unreadOnly = false) => {
    const params = new URLSearchParams();
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);
    if (unreadOnly) params.append('unread_only', 'true');

    const response = await api.get(`/notifications?${params.toString()}`);
    return response.data;
  },

  markAsRead: async (id) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllRead: async () => {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  }
};

export default notificationService;
