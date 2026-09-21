import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/orderService';
import { paymentService } from '../services/paymentService';
import { CheckoutSteps } from '../components/checkout/CheckoutSteps';
import {
  CreditCard,
  QrCode,
  Smartphone,
  Building2,
  Banknote,
  ShieldCheck,
  Lock,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Leaf,
  Info
} from 'lucide-react';

export const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItems, cartTotalAmount, deliveryFee, grandTotal, clearCart } = useCart();
  const { user } = useAuth();

  // Retrieve delivery details from location state or session
  const [deliveryDetails, setDeliveryDetails] = useState(() => {
    if (location.state?.deliveryDetails) {
      return location.state.deliveryDetails;
    }
    const saved = sessionStorage.getItem('farm2home_checkout_details');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return null;
  });

  // Track existing created order ID in case of retries
  const [createdOrder, setCreatedOrder] = useState(null);

  // Active payment method: 'upi' | 'card' | 'netbanking' | 'cod'
  const [selectedMethod, setSelectedMethod] = useState('upi');

  // Method specific inputs
  const [upiId, setUpiId] = useState('customer@okhdfcbank');
  const [upiVerified, setUpiVerified] = useState(true);

  const [cardData, setCardData] = useState({
    number: '4532 •••• •••• 8821',
    name: user?.full_name || 'Priya Sharma',
    expiry: '08/28',
    cvv: '•••'
  });

  const [bankName, setBankName] = useState('State Bank of India (SBI)');

  // Submission & error states
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [simulateFailure, setSimulateFailure] = useState(false);

  // Guard: If no items in cart and no created order, redirect back to marketplace
  useEffect(() => {
    if (cartItems.length === 0 && !createdOrder) {
      navigate('/dashboard/customer', { replace: true });
    }
  }, [cartItems, createdOrder, navigate]);

  const paymentMethods = [
    {
      id: 'upi',
      name: 'Instant UPI',
      subtitle: 'Google Pay, PhonePe, Paytm, BHIM, QR',
      icon: Smartphone,
      badge: 'Fastest & Zero Fee'
    },
    {
      id: 'card',
      name: 'Credit / Debit Card',
      subtitle: 'Visa, MasterCard, RuPay, Diners',
      icon: CreditCard,
      badge: '128-bit Encrypted'
    },
    {
      id: 'netbanking',
      name: 'Net Banking',
      subtitle: 'All major Indian commercial & cooperative banks',
      icon: Building2,
      badge: null
    },
    {
      id: 'cod',
      name: 'Cash on Delivery (COD)',
      subtitle: 'Pay via cash or UPI upon harvest delivery',
      icon: Banknote,
      badge: 'Pay at Doorstep'
    }
  ];

  const handlePayOrPlaceOrder = async () => {
    if (isProcessing) return; // Prevent double-submission
    setErrorMessage('');
    setIsProcessing(true);

    try {
      let order = createdOrder;

      // 1. Create order if not already created
      if (!order) {
        if (!deliveryDetails) {
          throw new Error('Delivery address details missing. Please return to checkout.');
        }

        const orderPayload = {
          delivery_address: deliveryDetails.delivery_address,
          city: deliveryDetails.city,
          pincode: deliveryDetails.pincode,
          phone: deliveryDetails.phone,
          full_name: deliveryDetails.full_name,
          delivery_slot: deliveryDetails.delivery_slot,
          notes: deliveryDetails.notes,
          payment_method: selectedMethod === 'cod' ? 'Cash on Delivery' : selectedMethod.toUpperCase(),
          idempotency_key: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        };

        const orderRes = await orderService.createOrder(orderPayload);
        order = orderRes.order;
        setCreatedOrder(order);
      }

      // 2. Process / Verify Payment
      // Non-negotiable security requirement: No raw card details transmitted or stored
      const paymentPayload = {
        order_id: order.id,
        payment_method: selectedMethod === 'cod' ? 'Cash on Delivery' : (selectedMethod === 'upi' ? 'UPI' : selectedMethod === 'card' ? 'Card' : 'Net Banking'),
        upi_id: selectedMethod === 'upi' ? upiId : undefined,
        bank_name: selectedMethod === 'netbanking' ? bankName : undefined,
        card_network: selectedMethod === 'card' ? 'Visa' : undefined,
        simulate_failure: simulateFailure
      };

      const paymentRes = await paymentService.processPayment(paymentPayload);

      // 3. Clear cart locally
      await clearCart();
      sessionStorage.removeItem('farm2home_checkout_details');

      // 4. Navigate to confirmation screen
      navigate(`/order-confirmation/${order.id}`, { replace: true });

    } catch (err) {
      console.error('Payment / Order processing failed:', err);
      const msg = err.response?.data?.detail || err.message || 'Payment transaction could not be completed. Please retry.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const amountPayable = createdOrder ? createdOrder.total_amount : grandTotal;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-app)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header style={{
        height: '64px',
        backgroundColor: 'var(--color-bg-surface)',
        borderBottom: 'var(--border-hairline)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/checkout')}
            disabled={isProcessing}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 10px' }}
          >
            <ArrowLeft size={16} />
            <span>Delivery details</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Leaf size={20} color="var(--color-primary)" />
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-primary)' }}>Farm2Home</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          <Lock size={15} color="var(--color-primary)" />
          <span>PCI-DSS Compliant Gateway</span>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: '860px', width: '100%', margin: '0 auto', padding: '24px 16px' }}>
        <CheckoutSteps currentStep={3} />

        {/* Amount Due Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
          color: '#ffffff',
          borderRadius: 'var(--radius-md)',
          padding: '22px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(22, 101, 52, 0.15)'
        }}>
          <div>
            <div style={{ fontSize: '0.875rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Amount Payable
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '2px' }}>
              ₹{amountPayable}
            </div>
            <div style={{ fontSize: '0.8125rem', opacity: 0.85, marginTop: '4px' }}>
              Includes ₹30 direct farm delivery fee · Zero hidden charges
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#ffffff', border: 'none' }}>
              Direct Farmer Payment
            </span>
          </div>
        </div>

        {/* Error / Failure Banner with Retry */}
        {errorMessage && (
          <div style={{
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid #fca5a5',
            borderRadius: 'var(--radius-sm)',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <AlertCircle size={22} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: 'var(--color-danger)', fontSize: '0.9375rem' }}>
                Payment Transaction Incomplete
              </div>
              <p style={{ fontSize: '0.875rem', color: '#991b1b', marginTop: '2px' }}>
                {errorMessage}
              </p>
              <div style={{ marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={handlePayOrPlaceOrder}
                  disabled={isProcessing}
                  className="btn btn-secondary btn-sm"
                  style={{ backgroundColor: '#ffffff', borderColor: '#f87171', color: 'var(--color-danger)', gap: '6px' }}
                >
                  <RefreshCw size={14} className={isProcessing ? 'spin' : ''} />
                  <span>Retry Payment</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="card-flat" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '16px' }}>
            Select Payment Method
          </h2>

          {/* Payment Method Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            {paymentMethods.map((method) => {
              const isSelected = selectedMethod === method.id;
              const Icon = method.icon;

              return (
                <div
                  key={method.id}
                  onClick={() => !isProcessing && setSelectedMethod(method.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? '2px solid var(--color-primary)' : 'var(--border-hairline)',
                    backgroundColor: isSelected ? 'var(--color-bg-surface)' : 'var(--color-bg-app)',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <input
                        type="radio"
                        name="payment_method"
                        checked={isSelected}
                        onChange={() => setSelectedMethod(method.id)}
                        disabled={isProcessing}
                        style={{ accentColor: 'var(--color-primary)', width: '18px', height: '18px', cursor: 'pointer' }}
                      />

                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--color-bg-subtle)',
                        color: isSelected ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Icon size={22} />
                      </div>

                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.975rem', color: 'var(--color-text-main)' }}>
                          {method.name}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                          {method.subtitle}
                        </div>
                      </div>
                    </div>

                    {method.badge && (
                      <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                        {method.badge}
                      </span>
                    )}
                  </div>

                  {/* Sub-fields: Active only for selected method */}
                  {isSelected && (
                    <div style={{
                      backgroundColor: 'var(--color-bg-app)',
                      borderTop: 'var(--border-hairline)',
                      padding: '16px 20px'
                    }}>
                      {/* UPI Fields */}
                      {method.id === 'upi' && (
                        <div>
                          <label className="form-label" style={{ marginBottom: '6px' }}>
                            Enter UPI ID / VPA
                          </label>
                          <div style={{ display: 'flex', gap: '8px', maxWidth: '420px' }}>
                            <input
                              type="text"
                              className="form-input"
                              value={upiId}
                              onChange={(e) => setUpiId(e.target.value)}
                              placeholder="mobile@upi / username@okhdfcbank"
                              disabled={isProcessing}
                            />
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setUpiVerified(true)}
                              disabled={isProcessing}
                            >
                              <CheckCircle size={14} color="var(--color-success)" />
                              <span>Verified</span>
                            </button>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            <QrCode size={14} />
                            <span>Or scan dynamic QR on next step via GPay, PhonePe, or Paytm app</span>
                          </div>
                        </div>
                      )}

                      {/* Card Fields */}
                      {method.id === 'card' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '460px' }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Card Number</label>
                            <input
                              type="text"
                              className="form-input"
                              value={cardData.number}
                              onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                              placeholder="4532 0000 0000 0000"
                              disabled={isProcessing}
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Expiry Date</label>
                              <input
                                type="text"
                                className="form-input"
                                value={cardData.expiry}
                                onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                                placeholder="MM/YY"
                                maxLength="5"
                                disabled={isProcessing}
                              />
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">CVV / CVC</label>
                              <input
                                type="password"
                                className="form-input"
                                value={cardData.cvv}
                                onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                                placeholder="123"
                                maxLength="4"
                                disabled={isProcessing}
                              />
                            </div>
                          </div>

                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Name on Card</label>
                            <input
                              type="text"
                              className="form-input"
                              value={cardData.name}
                              onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                              placeholder="Cardholder Name"
                              disabled={isProcessing}
                            />
                          </div>

                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ShieldCheck size={14} color="var(--color-success)" />
                            <span>Security Guaranteed: In accordance with PCI standards, raw card details are never saved.</span>
                          </div>
                        </div>
                      )}

                      {/* Net Banking Fields */}
                      {method.id === 'netbanking' && (
                        <div style={{ maxWidth: '420px' }}>
                          <label className="form-label" style={{ marginBottom: '6px' }}>Select Financial Institution</label>
                          <select
                            className="form-input"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            disabled={isProcessing}
                          >
                            <option value="State Bank of India (SBI)">State Bank of India (SBI)</option>
                            <option value="HDFC Bank">HDFC Bank</option>
                            <option value="ICICI Bank">ICICI Bank</option>
                            <option value="Axis Bank">Axis Bank</option>
                            <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                            <option value="Punjab National Bank">Punjab National Bank</option>
                            <option value="Tamilnad Mercantile Bank">Tamilnad Mercantile Bank</option>
                            <option value="Canara Bank">Canara Bank</option>
                          </select>
                        </div>
                      )}

                      {/* Cash on Delivery Notice */}
                      {method.id === 'cod' && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.875rem', color: 'var(--color-text-main)' }}>
                          <Info size={18} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <div>
                            <p style={{ fontWeight: 500 }}>No online payment required now.</p>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                              You can inspect the harvest upon delivery and hand cash or scan the delivery partner's UPI QR code at your doorstep.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Developer / Testing Simulation Failure Toggle */}
          <div style={{
            marginTop: '16px',
            padding: '10px 14px',
            backgroundColor: 'var(--color-bg-subtle)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8125rem',
            color: 'var(--color-text-muted)'
          }}>
            <span>Simulate gateway decline (for error & retry verification):</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.checked)}
                disabled={isProcessing}
              />
              <span style={{ fontWeight: 500 }}>Force Gateway Error</span>
            </label>
          </div>
        </div>

        {/* Action Button & Guarantee */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            type="button"
            onClick={handlePayOrPlaceOrder}
            disabled={isProcessing}
            className="btn btn-primary btn-lg"
            style={{
              width: '100%',
              gap: '10px',
              justifyContent: 'center',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.75 : 1
            }}
          >
            {isProcessing ? (
              <>
                <RefreshCw size={18} className="spin" />
                <span>Processing secure transaction...</span>
              </>
            ) : selectedMethod === 'cod' ? (
              <>
                <Banknote size={18} />
                <span>Place Farm Order (₹{amountPayable} on Delivery)</span>
              </>
            ) : (
              <>
                <Lock size={18} />
                <span>Pay ₹{amountPayable} Securely</span>
              </>
            )}
          </button>

          <div style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            🔒 Bank-grade 256-bit encryption. All funds directly credited to farmers after doorstep delivery.
          </div>
        </div>
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};
