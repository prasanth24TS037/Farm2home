import api from './api';

export const aiService = {
  sendFarmerMessage: async (message, language = 'en', history = []) => {
    const response = await api.post('/ai/assistant', {
      message,
      language,
      history
    });
    return response.data;
  }
};
