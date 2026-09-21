import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sprout, MapPin, Truck, ShoppingBag, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import '../styles/auth.css';

const ROLE_DASHBOARDS = {
  farmer: '/dashboard/farmer',
  customer: '/dashboard/customer',
  delivery: '/dashboard/delivery',
};

const ROLE_COLORS = {
  farmer: { bg: 'var(--color-accent-farmer-bg)', color: 'var(--color-accent-farmer)', btn: 'var(--color-accent-farmer)' },
  customer: { bg: 'var(--color-accent-customer-bg)', color: 'var(--color-accent-customer)', btn: 'var(--color-accent-customer)' },
  delivery: { bg: 'var(--color-accent-delivery-bg)', color: 'var(--color-accent-delivery)', btn: 'var(--color-accent-delivery)' },
};

const ROLE_ICONS = { farmer: Sprout, customer: ShoppingBag, delivery: Truck };

export const ProfileCompletionPage = () => {
  const navigate = useNavigate();
  const { user, updateProfile, loading } = useAuth();
  const { t } = useLanguage();

  const role = user?.role || 'customer';
  const colors = ROLE_COLORS[role] || ROLE_COLORS.customer;
  const RoleIcon = ROLE_ICONS[role] || ShoppingBag;

  const [farmName, setFarmName] = useState(user?.farmer?.farm_name || '');
  const [farmLocation, setFarmLocation] = useState(user?.farmer?.location || '');
  const [deliveryAddress, setDeliveryAddress] = useState(user?.customer?.delivery_address || '');
  const [vehicleNumber, setVehicleNumber] = useState(user?.delivery?.vehicle_number || '');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (role === 'farmer') {
      if (!farmName.trim()) errs.farmName = 'Farm name is required';
      if (!farmLocation.trim()) errs.farmLocation = 'Location is required';
    } else if (role === 'customer') {
      if (!deliveryAddress.trim()) errs.deliveryAddress = 'Delivery address is required';
    } else if (role === 'delivery') {
      if (!vehicleNumber.trim()) errs.vehicleNumber = 'Vehicle number is required';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setError('');
    try {
      const payload = {};
      if (role === 'farmer') { payload.farm_name = farmName.trim(); payload.location = farmLocation.trim(); }
      if (role === 'customer') { payload.delivery_address = deliveryAddress.trim(); }
      if (role === 'delivery') { payload.vehicle_number = vehicleNumber.trim(); }

      await updateProfile(payload);
      navigate(ROLE_DASHBOARDS[role] || '/');
    } catch (err) {
      setError(err?.response?.data?.detail || t('authErrorGeneric'));
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{
        width: '100%', maxWidth: '480px',
        background: 'var(--color-bg-surface)',
        border: 'var(--border-hairline)',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
      }}>
        {/* Role icon */}
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: colors.bg, color: colors.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20
        }}>
          <RoleIcon size={24} />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8, color: 'var(--color-text-main)', letterSpacing: '-0.3px' }}>
          {t('completeProfile')}
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: 28, lineHeight: 1.6 }}>
          {t('completeProfileDesc')}
        </p>

        {error && (
          <div className="auth-error-banner" role="alert" aria-live="assertive">
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {role === 'farmer' && (
            <>
              <div className="auth-form-group">
                <label htmlFor="farm-name" className="auth-label">{t('farmName')}</label>
                <div className="auth-input-wrap">
                  <Sprout size={16} className="auth-input-icon" />
                  <input
                    id="farm-name"
                    type="text"
                    className={`auth-input${fieldErrors.farmName ? ' error' : ''}`}
                    value={farmName}
                    onChange={(e) => { setFarmName(e.target.value); if (fieldErrors.farmName) setFieldErrors(p => ({...p, farmName: ''})); }}
                    placeholder="e.g. Cauvery Organic Farms"
                    autoFocus
                  />
                </div>
                {fieldErrors.farmName && <span className="auth-field-error" role="alert"><AlertCircle size={12} /> {fieldErrors.farmName}</span>}
              </div>
              <div className="auth-form-group">
                <label htmlFor="farm-location" className="auth-label">{t('farmLocation')}</label>
                <div className="auth-input-wrap">
                  <MapPin size={16} className="auth-input-icon" />
                  <input
                    id="farm-location"
                    type="text"
                    className={`auth-input${fieldErrors.farmLocation ? ' error' : ''}`}
                    value={farmLocation}
                    onChange={(e) => { setFarmLocation(e.target.value); if (fieldErrors.farmLocation) setFieldErrors(p => ({...p, farmLocation: ''})); }}
                    placeholder="e.g. Thanjavur, Tamil Nadu"
                  />
                </div>
                {fieldErrors.farmLocation && <span className="auth-field-error" role="alert"><AlertCircle size={12} /> {fieldErrors.farmLocation}</span>}
              </div>
            </>
          )}

          {role === 'customer' && (
            <div className="auth-form-group">
              <label htmlFor="delivery-addr" className="auth-label">{t('deliveryAddress')}</label>
              <div className="auth-input-wrap">
                <MapPin size={16} className="auth-input-icon" />
                <input
                  id="delivery-addr"
                  type="text"
                  className={`auth-input${fieldErrors.deliveryAddress ? ' error' : ''}`}
                  value={deliveryAddress}
                  onChange={(e) => { setDeliveryAddress(e.target.value); if (fieldErrors.deliveryAddress) setFieldErrors(p => ({...p, deliveryAddress: ''})); }}
                  placeholder="Apartment, Street, Area, City"
                  autoFocus
                />
              </div>
              {fieldErrors.deliveryAddress && <span className="auth-field-error" role="alert"><AlertCircle size={12} /> {fieldErrors.deliveryAddress}</span>}
            </div>
          )}

          {role === 'delivery' && (
            <div className="auth-form-group">
              <label htmlFor="vehicle-num" className="auth-label">{t('vehicleNumber')}</label>
              <div className="auth-input-wrap">
                <Truck size={16} className="auth-input-icon" />
                <input
                  id="vehicle-num"
                  type="text"
                  className={`auth-input${fieldErrors.vehicleNumber ? ' error' : ''}`}
                  value={vehicleNumber}
                  onChange={(e) => { setVehicleNumber(e.target.value.toUpperCase()); if (fieldErrors.vehicleNumber) setFieldErrors(p => ({...p, vehicleNumber: ''})); }}
                  placeholder="TN-09-EV-4421"
                  autoFocus
                />
              </div>
              {fieldErrors.vehicleNumber && <span className="auth-field-error" role="alert"><AlertCircle size={12} /> {fieldErrors.vehicleNumber}</span>}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
            style={{ background: colors.btn, color: '#fff', marginTop: 8 }}
          >
            {loading ? (
              <><div className="auth-spinner" /> {t('saving')}</>
            ) : t('completeProfileSave')}
          </button>
        </form>
      </div>
    </div>
  );
};
