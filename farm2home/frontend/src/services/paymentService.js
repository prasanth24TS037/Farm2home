import api from './api';

export const paymentService = {
  processPayment: async (paymentData) => {
    // Non-negotiable security requirement: No raw card numbers or CVVs are transmitted for persistence
    const sanitizedData = {
      order_id: paymentData.order_id,
      payment_method: paymentData.payment_method,
      upi_id: paymentData.upi_id || undefined,
      bank_name: paymentData.bank_name || undefined,
      card_last_four: paymentData.card_number ? paymentData.card_number.replace(/\s+/g, '').slice(-4) : undefined,
      card_network: paymentData.card_network || undefined,
      simulate_failure: Boolean(paymentData.simulate_failure)
    };

    const response = await api.post('/payments/process', sanitizedData);
    return response.data;
  },

  getNotifications: async () => {
    const response = await api.get('/payments/notifications');
    return response.data;
  },

  getFarmerEarnings: async () => {
    const response = await api.get('/payments/farmer-earnings');
    return response.data;
  },

  requestPayout: async (amount, notes = '') => {
    const response = await api.post('/payments/payout-request', {
      amount: parseFloat(amount),
      notes: notes || undefined
    });
    return response.data;
  },

  updatePayoutAccount: async (accountData) => {
    // Non-negotiable security: only pass raw account number if user specifically entered a new one to extract last 4 digits
    const response = await api.patch('/payments/payout-account', {
      payout_method: accountData.payout_method,
      upi_id: accountData.upi_id || undefined,
      account_holder: accountData.account_holder || undefined,
      account_number: accountData.account_number || undefined,
      bank_name: accountData.bank_name || undefined,
      bank_ifsc: accountData.bank_ifsc || undefined
    });
    return response.data;
  }
};
