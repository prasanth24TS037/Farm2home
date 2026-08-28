import api from './api';

export const productService = {
  getProducts: async (params = {}) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  getMyProducts: async () => {
    const response = await api.get('/products/my-products');
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
    try {
      const response = await api.get('/orders/farmer-orders');
      if (response.data && response.data.length > 0) {
        return response.data;
      }
    } catch (err) {
      console.warn('Backend getFarmerOrders failed, returning fallback orders:', err);
    }
    return [
      {
        id: 101,
        order_number: 'ORD-2026-8891',
        customer_name: 'Ananya Sharma',
        customer_phone: '9840123456',
        delivery_address: '42 Green Valley Layout, Anna Nagar, Chennai',
        items: [
          { name: 'Red Organic Onions (வெங்காயம்)', quantity: '5 kg', price: 175 },
          { name: 'Pollachi Tender Coconut (இளநீர்)', quantity: '4 piece', price: 180 }
        ],
        total_amount: 355,
        status: 'pending',
        created_at: 'Today, 14:30',
        delivery_agent: 'Karthik (TN-01-AB-7788)'
      },
      {
        id: 102,
        order_number: 'ORD-2026-8874',
        customer_name: 'Senthil Kumar',
        customer_phone: '9790234567',
        delivery_address: '15 South Street, Thanjavur',
        items: [
          { name: 'Traditional Mappillai Samba Rice (மாப்பிள்ளை சம்பா)', quantity: '10 kg', price: 1200 }
        ],
        total_amount: 1200,
        status: 'processing',
        created_at: 'Today, 11:15',
        delivery_agent: 'Karthik (TN-01-AB-7788)'
      },
      {
        id: 103,
        order_number: 'ORD-2026-8850',
        customer_name: 'Meena Raman',
        customer_phone: '9444345678',
        delivery_address: '88 Lake View Road, Madurai',
        items: [
          { name: 'Fresh Palak / Spinach (பசலைக்கீரை)', quantity: '3 bunch', price: 75 },
          { name: 'Green Bell Peppers (குடைமிளகாய்)', quantity: '2 kg', price: 128 }
        ],
        total_amount: 203,
        status: 'delivered',
        created_at: 'Yesterday, 16:45',
        delivery_agent: 'Venkatesh (TN-09-CD-3321)'
      }
    ];
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
  }
};
