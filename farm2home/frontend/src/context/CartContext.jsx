import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartService } from '../services/cartService';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('farm2home_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Sync with backend on mount and when auth token changes
  const fetchBackendCart = useCallback(async () => {
    const token = localStorage.getItem('farm2home_token');
    if (!token) return;

    try {
      setLoading(true);
      const data = await cartService.getCart();
      if (data && Array.isArray(data.items)) {
        const normalized = data.items.map(item => ({
          ...item,
          id: item.product_id, // keep product id as primary identifier for UI consistency
          cart_item_id: item.id
        }));
        setCartItems(normalized);
        localStorage.setItem('farm2home_cart', JSON.stringify(normalized));
      }
    } catch (err) {
      console.warn('Could not sync cart with backend:', err?.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackendCart();
  }, [fetchBackendCart]);

  useEffect(() => {
    localStorage.setItem('farm2home_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = async (product, quantity = 1) => {
    setErrorMessage(null);
    const prodId = product.product_id || product.id;
    const addQty = parseFloat(quantity) || 1;

    // Optimistic UI update
    setCartItems(prev => {
      const existingIndex = prev.findIndex(item => (item.product_id || item.id) === prodId);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + addQty
        };
        return updated;
      }
      return [...prev, {
        id: prodId,
        product_id: prodId,
        name: product.name,
        price_per_unit: product.price_per_unit,
        unit: product.unit || 'kg',
        image_url: product.image_url,
        stock_quantity: product.stock_quantity,
        farmer_name: product.farmer_name || (product.farmer?.farm_name) || 'Direct Farm Harvest',
        quantity: addQty
      }];
    });

    // Backend sync
    const token = localStorage.getItem('farm2home_token');
    if (token) {
      try {
        await cartService.addToCart(prodId, addQty);
      } catch (err) {
        const msg = err.response?.data?.detail || 'Failed to add item to basket.';
        setErrorMessage(msg);
        alert(msg);
        fetchBackendCart(); // Revert to backend state
      }
    }
  };

  const updateQuantity = async (productId, newQty) => {
    setErrorMessage(null);
    const targetQty = parseFloat(newQty);

    if (targetQty <= 0) {
      return removeFromCart(productId);
    }

    // Optimistic update
    setCartItems(prev =>
      prev.map(item =>
        (item.product_id || item.id) === productId
          ? { ...item, quantity: targetQty }
          : item
      )
    );

    // Backend sync
    const token = localStorage.getItem('farm2home_token');
    if (token) {
      try {
        await cartService.updateCartItem(productId, targetQty);
      } catch (err) {
        const msg = err.response?.data?.detail || 'Unable to update quantity.';
        setErrorMessage(msg);
        alert(msg);
        fetchBackendCart(); // Revert
      }
    }
  };

  const removeFromCart = async (productId) => {
    setErrorMessage(null);
    setCartItems(prev => prev.filter(item => (item.product_id || item.id) !== productId));

    const token = localStorage.getItem('farm2home_token');
    if (token) {
      try {
        await cartService.removeCartItem(productId);
      } catch (err) {
        console.warn('Failed to remove cart item on backend:', err);
      }
    }
  };

  const clearCart = async () => {
    setCartItems([]);
    localStorage.removeItem('farm2home_cart');

    const token = localStorage.getItem('farm2home_token');
    if (token) {
      try {
        await cartService.clearCart();
      } catch (err) {
        console.warn('Failed to clear cart on backend:', err);
      }
    }
  };

  const totalItemsCount = cartItems.reduce((acc, item) => acc + (parseFloat(item.quantity) || 0), 0);
  const cartTotalAmount = Math.round(cartItems.reduce((acc, item) => acc + ((parseFloat(item.price_per_unit) || 0) * (parseFloat(item.quantity) || 0)), 0));
  const deliveryFee = cartItems.length > 0 ? 30 : 0;
  const grandTotal = cartTotalAmount + deliveryFee;

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      refreshCart: fetchBackendCart,
      totalItemsCount,
      cartTotalAmount,
      deliveryFee,
      grandTotal,
      loading,
      errorMessage
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
