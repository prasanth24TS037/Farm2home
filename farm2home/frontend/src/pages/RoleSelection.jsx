import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { Sprout, ShoppingBag, Truck, ShieldCheck, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export const RoleSelection = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { login } = useAuth();

  const handleQuickDemoLogin = async (role, email, password) => {
    try {
      await login({ email, password, role });
      navigate(`/dashboard/${role}`);
    } catch (err) {
      alert('Demo login failed. Ensure backend is running.');
    }
  };

  return (
    <div className="role-landing-container">
      {/* Top Header */}
      <header className="landing-header">
        <div className="brand-badge">
          <Sprout size={28} color="var(--color-primary)" />
          <span>Farm2Home</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <LanguageToggle />
        </div>
      </header>

      {/* Hero Section */}
      <main className="role-selection-hero">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', backgroundColor: 'var(--color-primary-light)', border: '1px solid var(--color-primary-border)', borderRadius: 'var(--radius-full)', marginBottom: '16px' }}>
          <Sparkles size={16} color="var(--color-primary)" />
          <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-primary)' }}>Direct From Farm to Doorstep</span>
        </div>

        <h1 style={{ fontSize: '2.25rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
          {t('selectRole')}
        </h1>
        <p className="hero-tagline">{t('tagline')}</p>

        {/* 3 Large Role Cards */}
        <div className="role-cards-grid">
          {/* Farmer Card */}
          <div
            className="role-card farmer-accent"
            onClick={() => navigate('/login/farmer')}
          >
            <div>
              <div className="role-icon-box" style={{ backgroundColor: 'var(--color-accent-farmer-bg)', color: 'var(--color-accent-farmer)' }}>
                <Sprout size={32} />
              </div>
              <h2 className="role-card-title">{t('farmerRole')}</h2>
              <p className="role-card-context">{t('farmerDesc')}</p>
            </div>
            <div className="role-card-footer" style={{ color: 'var(--color-accent-farmer)' }}>
              <span>Enter farmer portal</span>
              <ArrowRight size={18} />
            </div>
          </div>

          {/* Customer Card */}
          <div
            className="role-card customer-accent"
            onClick={() => navigate('/login/customer')}
          >
            <div>
              <div className="role-icon-box" style={{ backgroundColor: 'var(--color-accent-customer-bg)', color: 'var(--color-accent-customer)' }}>
                <ShoppingBag size={32} />
              </div>
              <h2 className="role-card-title">{t('customerRole')}</h2>
              <p className="role-card-context">{t('customerDesc')}</p>
            </div>
            <div className="role-card-footer" style={{ color: 'var(--color-accent-customer)' }}>
              <span>Shop fresh produce</span>
              <ArrowRight size={18} />
            </div>
          </div>

          {/* Delivery Card */}
          <div
            className="role-card delivery-accent"
            onClick={() => navigate('/login/delivery')}
          >
            <div>
              <div className="role-icon-box" style={{ backgroundColor: 'var(--color-accent-delivery-bg)', color: 'var(--color-accent-delivery)' }}>
                <Truck size={32} />
              </div>
              <h2 className="role-card-title">{t('deliveryRole')}</h2>
              <p className="role-card-context">{t('deliveryDesc')}</p>
            </div>
            <div className="role-card-footer" style={{ color: 'var(--color-accent-delivery)' }}>
              <span>Partner delivery console</span>
              <ArrowRight size={18} />
            </div>
          </div>
        </div>

        {/* 1-Click Fast Demo Testing Bar */}
        <div className="demo-accounts-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} color="var(--color-primary)" />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>1-Click Instant Demo Login:</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => handleQuickDemoLogin('farmer', 'farmer@farm2home.com', 'Farmer@123')}
            >
              🌱 Demo Farmer
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => handleQuickDemoLogin('customer', 'customer@farm2home.com', 'Customer@123')}
            >
              🛒 Demo Customer
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => handleQuickDemoLogin('delivery', 'delivery@farm2home.com', 'Delivery@123')}
            >
              🛵 Demo Delivery
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => handleQuickDemoLogin('admin', 'admin@farm2home.com', 'Admin@123')}
            >
              🛡️ Demo Admin
            </button>
          </div>
        </div>

        {/* Internal Admin Link */}
        <div style={{ marginTop: '24px' }}>
          <a
            href="/login/admin"
            style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ShieldCheck size={14} />
            <span>Internal platform administration</span>
          </a>
        </div>
      </main>
    </div>
  );
};
