import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { CheckoutSteps } from '../components/checkout/CheckoutSteps';
import { getImageUrl } from '../utils/imageUtils';
import {
  MapPin,
  Clock,
  FileText,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Truck,
  Leaf,
  AlertCircle
} from 'lucide-react';

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cartItems, totalItemsCount, cartTotalAmount, deliveryFee, grandTotal } = useCart();
  const { user } = useAuth();

  // Guard: Empty cart redirect
  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/dashboard/customer', { replace: true });
    }
  }, [cartItems, navigate]);

  // Pre-fill form from user profile or saved checkout session
  const [formData, setFormData] = useState(() => {
    const saved = sessionStorage.getItem('farm2home_checkout_details');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return {
      full_name: user?.full_name || '',
      phone: (user?.phone || '').replace('+91', '').trim(),
      delivery_address: user?.customer?.delivery_address || user?.delivery_address || 'Flat 4B, Greenwoods Apartments, 1st Cross, Gandhi Road',
      city: user?.customer?.city || user?.city || 'Chennai',
      pincode: user?.customer?.pincode || user?.pincode || '600042',
      delivery_slot: 'Morning (7:00 AM - 10:00 AM)',
      notes: ''
    };
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const deliverySlots = [
    { id: 'morning', label: 'Morning (7:00 AM - 10:00 AM)', desc: 'Harvested at dawn, delivered for breakfast' },
    { id: 'afternoon', label: 'Afternoon (12:00 PM - 3:00 PM)', desc: 'Midday dispatch for fresh cooking' },
    { id: 'evening', label: 'Evening (5:00 PM - 8:00 PM)', desc: 'Direct farm harvest for dinner prep' }
  ];

  const validateField = (name, value) => {
    switch (name) {
      case 'full_name':
        if (!value || value.trim().length < 2) return 'Full name is required (min 2 characters).';
        return '';
      case 'phone': {
        const cleaned = value.replace(/\D/g, '');
        if (!cleaned) return 'Phone number is required for delivery coordination.';
        if (cleaned.length !== 10) return 'Please enter a valid 10-digit mobile number.';
        return '';
      }
      case 'delivery_address':
        if (!value || value.trim().length < 6) return 'Detailed delivery street address is required.';
        return '';
      case 'city':
        if (!value || value.trim().length < 2) return 'City is required.';
        return '';
      case 'pincode': {
        const cleanedPin = value.replace(/\D/g, '');
        if (!cleanedPin) return 'Pincode is required.';
        if (cleanedPin.length !== 6) return 'Please enter a valid 6-digit postal pincode.';
        return '';
      }
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      sessionStorage.setItem('farm2home_checkout_details', JSON.stringify(updated));
      return updated;
    });

    if (touched[name]) {
      const errorMsg = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: errorMsg }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const errorMsg = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate all required fields
    const newErrors = {};
    ['full_name', 'phone', 'delivery_address', 'city', 'pincode'].forEach((field) => {
      const err = validateField(field, formData[field]);
      if (err) newErrors[field] = err;
    });

    setTouched({
      full_name: true,
      phone: true,
      delivery_address: true,
      city: true,
      pincode: true
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      // Scroll to first error field
      const firstErrorField = document.querySelector('.form-input-error');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstErrorField.focus();
      }
      return;
    }

    // Persist verified checkout details and navigate to payment
    sessionStorage.setItem('farm2home_checkout_details', JSON.stringify(formData));
    navigate('/payment', { state: { deliveryDetails: formData } });
  };

  // Extract distinct farmer names
  const farmerNames = Array.from(new Set(cartItems.map((i) => i.farmer_name || 'Direct Farm Harvest')));

  if (cartItems.length === 0) {
    return null; // Handled by useEffect redirect
  }

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
            onClick={() => navigate('/cart')}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 10px' }}
          >
            <ArrowLeft size={16} />
            <span>Back to Basket</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Leaf size={20} color="var(--color-primary)" />
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-primary)' }}>Farm2Home</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          <ShieldCheck size={16} color="var(--color-success)" />
          <span>Secure Farm Checkout</span>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: '1080px', width: '100%', margin: '0 auto', padding: '24px 16px' }}>
        <CheckoutSteps currentStep={2} />

        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
            Confirm Delivery Destination
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Direct-from-farm dispatch requires accurate doorstep coordinates
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1.1fr)',
            gap: '24px',
            alignItems: 'start'
          }}>
            {/* Left: Delivery Details Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="card-flat">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <MapPin size={20} color="var(--color-primary)" />
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Recipient & Address Details</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {/* Full Name */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">
                      Full Name <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      className={`form-input ${errors.full_name ? 'form-input-error' : ''}`}
                      value={formData.full_name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="e.g. Priya Sharma"
                    />
                    {errors.full_name && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <AlertCircle size={12} /> {errors.full_name}
                      </span>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">
                      Phone Number <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{ position: 'absolute', left: '12px', fontSize: '0.875rem', color: 'var(--color-text-muted)', pointerEvents: 'none' }}>
                        +91
                      </span>
                      <input
                        type="tel"
                        name="phone"
                        maxLength="10"
                        className={`form-input ${errors.phone ? 'form-input-error' : ''}`}
                        style={{ paddingLeft: '48px' }}
                        value={formData.phone}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="9876543210"
                      />
                    </div>
                    {errors.phone && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <AlertCircle size={12} /> {errors.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="form-group" style={{ marginTop: '16px', marginBottom: '16px' }}>
                  <label className="form-label">
                    House / Flat No., Street, Landmark <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="delivery_address"
                    className={`form-input ${errors.delivery_address ? 'form-input-error' : ''}`}
                    value={formData.delivery_address}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="e.g. Flat 4B, Greenwoods Apartments, 1st Cross, Gandhi Road"
                  />
                  {errors.delivery_address && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <AlertCircle size={12} /> {errors.delivery_address}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {/* City */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">
                      City / District <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      className={`form-input ${errors.city ? 'form-input-error' : ''}`}
                      value={formData.city}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="e.g. Chennai"
                    />
                    {errors.city && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <AlertCircle size={12} /> {errors.city}
                      </span>
                    )}
                  </div>

                  {/* Pincode */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">
                      Pincode <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      maxLength="6"
                      className={`form-input ${errors.pincode ? 'form-input-error' : ''}`}
                      value={formData.pincode}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="e.g. 600042"
                    />
                    {errors.pincode && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <AlertCircle size={12} /> {errors.pincode}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Delivery Slot Selection */}
              <div className="card-flat">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Clock size={20} color="var(--color-primary)" />
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Preferred Harvest Delivery Slot</h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {deliverySlots.map((slot) => {
                    const isSelected = formData.delivery_slot === slot.label;
                    return (
                      <label
                        key={slot.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-sm)',
                          border: isSelected ? '1px solid var(--color-primary)' : 'var(--border-hairline)',
                          backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--color-bg-surface)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input
                          type="radio"
                          name="delivery_slot"
                          value={slot.label}
                          checked={isSelected}
                          onChange={handleChange}
                          style={{ marginTop: '3px', accentColor: 'var(--color-primary)' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: isSelected ? 'var(--color-primary)' : 'var(--color-text-main)' }}>
                            {slot.label}
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            {slot.desc}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Delivery Notes / Instructions */}
              <div className="card-flat">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <FileText size={20} color="var(--color-primary)" />
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Special Delivery Instructions (Optional)</h2>
                </div>

                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
                  className="form-input"
                  placeholder="e.g. Leave at the doorstep, ring the bell twice, gate passcode #402..."
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Right: Condensed Order Summary (Sticky) */}
            <div className="card-flat" style={{ position: 'sticky', top: '88px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ borderBottom: 'var(--border-hairline)', paddingBottom: '12px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Order Summary</h2>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} from {farmerNames.length} {farmerNames.length === 1 ? 'farm' : 'farms'}
                </div>
              </div>

              {/* Farmer Badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {farmerNames.map((name) => (
                  <span key={name} className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                    🌾 {name}
                  </span>
                ))}
              </div>

              {/* Grouped Items by Farmer */}
              <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                {(() => {
                  const grouped = cartItems.reduce((acc, item) => {
                    const fName = item.farmer_name || 'Direct Farm Harvest';
                    if (!acc[fName]) acc[fName] = [];
                    acc[fName].push(item);
                    return acc;
                  }, {});

                  return Object.entries(grouped).map(([farmerName, items]) => {
                    const farmerSubtotal = items.reduce((s, i) => s + (parseFloat(i.price_per_unit) || 0) * (parseFloat(i.quantity) || 1), 0);
                    return (
                      <div key={farmerName} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--color-primary)',
                          borderBottom: '1px dashed var(--color-border)',
                          paddingBottom: '2px'
                        }}>
                          <span>🌾 From {farmerName}</span>
                          <span>₹{Math.round(farmerSubtotal)}</span>
                        </div>
                        {items.map((item) => {
                          const itemId = item.product_id || item.id;
                          const lineTotal = Math.round((parseFloat(item.price_per_unit) || 0) * (parseFloat(item.quantity) || 1));

                          return (
                            <div key={itemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <img
                                  src={getImageUrl(item.image_url)}
                                  alt={item.name}
                                  style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover' }}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=100&auto=format&fit=crop&q=80';
                                  }}
                                />
                                <span style={{ color: 'var(--color-text-main)', fontWeight: 500, fontSize: '0.8125rem' }}>
                                  {item.name} <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>× {item.quantity}</span>
                                </span>
                              </div>
                              <span style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: '0.8125rem' }}>₹{lineTotal}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="hairline-divider" style={{ margin: '4px 0' }} />

              {/* Pricing Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="flex-between" style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                  <span>Farm harvest subtotal</span>
                  <span style={{ fontWeight: 500, color: 'var(--color-text-main)' }}>₹{cartTotalAmount}</span>
                </div>

                <div className="flex-between" style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Truck size={14} />
                    <span>Direct farm delivery</span>
                  </div>
                  <span style={{ fontWeight: 500, color: 'var(--color-text-main)' }}>₹{deliveryFee}</span>
                </div>

                <div className="hairline-divider" style={{ margin: '4px 0' }} />

                <div className="flex-between" style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                  <span>Grand Total</span>
                  <span style={{ color: 'var(--color-primary)' }}>₹{grandTotal}</span>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', gap: '8px', justifyContent: 'center', marginTop: '6px' }}
              >
                <span>Continue to payment</span>
                <ArrowRight size={18} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                <ShieldCheck size={14} color="var(--color-success)" />
                <span>Zero pre-payment obligation on Cash on Delivery</span>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};
