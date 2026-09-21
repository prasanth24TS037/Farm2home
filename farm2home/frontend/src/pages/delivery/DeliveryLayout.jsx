import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { deliveryService } from '../../services/deliveryService';
import { LanguageToggle } from '../../components/common/LanguageToggle';
import { Bell, LogOut, Power, Home, Map, RotateCcw, User, Wallet } from 'lucide-react';

export const DeliveryLayout = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOnDuty, setIsOnDuty] = useState(true);

  useEffect(() => {
    deliveryService.getDashboard()
      .then(data => setIsOnDuty(data.is_on_duty))
      .catch(console.error);
  }, []);

  const handleToggleDuty = async () => {
    const newStatus = !isOnDuty;
    setIsOnDuty(newStatus);
    try {
      await deliveryService.updateAvailability(newStatus);
    } catch (err) {
      console.error(err);
      setIsOnDuty(!newStatus); // revert on failure
    }
  };

  const isActive = (path) => location.pathname.includes(path);

  return (
    <div className="delivery-mobile-frame">
      <header className="delivery-topbar">
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 600 }}>
            {user?.full_name || 'Delivery Partner'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Vehicle Details
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleToggleDuty}
            className={`badge ${isOnDuty ? 'badge-success' : 'badge-neutral'}`}
            style={{ cursor: 'pointer', padding: '6px 10px' }}
          >
            <Power size={12} />
            <span>{isOnDuty ? t('onDuty', 'On Duty') : t('offDuty', 'Off Duty')}</span>
          </button>

          <div className="icon-btn" style={{ width: '34px', height: '34px', position: 'relative' }}>
            <Bell size={16} />
            <div className="badge-dot" />
          </div>

          <button
            onClick={logout}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div style={{ padding: '8px 20px', backgroundColor: 'var(--color-bg-surface)', borderBottom: 'var(--border-hairline)', display: 'flex', justifyContent: 'flex-end' }}>
        <LanguageToggle />
      </div>

      <main style={{ flex: 1, padding: '16px 0', overflowY: 'auto', paddingBottom: '80px' }}>
        <Outlet context={{ isOnDuty, setIsOnDuty }} />
      </main>

      <nav className="delivery-bottom-nav">
        <div
          className={`tab-nav-item ${isActive('/dashboard/delivery/home') ? 'active' : ''}`}
          onClick={() => navigate('/dashboard/delivery/home')}
        >
          <Home size={20} />
          <span>{t('home', 'Home')}</span>
        </div>
        <div
          className={`tab-nav-item ${isActive('/dashboard/delivery/route') ? 'active' : ''}`}
          onClick={() => navigate('/dashboard/delivery/route')}
        >
          <Map size={20} />
          <span>{t('route', 'Route')}</span>
        </div>
        <div
          className={`tab-nav-item ${isActive('/dashboard/delivery/earnings') ? 'active' : ''}`}
          onClick={() => navigate('/dashboard/delivery/earnings')}
        >
          <Wallet size={20} />
          <span>{t('earnings', 'Earnings')}</span>
        </div>
        <div
          className={`tab-nav-item ${isActive('/dashboard/delivery/history') ? 'active' : ''}`}
          onClick={() => navigate('/dashboard/delivery/history')}
        >
          <RotateCcw size={20} />
          <span>{t('history', 'History')}</span>
        </div>
        <div
          className={`tab-nav-item ${isActive('/dashboard/delivery/profile') ? 'active' : ''}`}
          onClick={() => navigate('/dashboard/delivery/profile')}
        >
          <User size={20} />
          <span>{t('profile', 'Profile')}</span>
        </div>
      </nav>
    </div>
  );
};
