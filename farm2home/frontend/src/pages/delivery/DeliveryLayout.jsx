import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { deliveryService } from '../../services/deliveryService';
import { LanguageToggle } from '../../components/common/LanguageToggle';
import { Bell, LogOut, Power, Home, Map, RotateCcw, User, Wallet, X, Check, CheckCheck, Truck, ChevronRight } from 'lucide-react';

export const DeliveryLayout = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOnDuty, setIsOnDuty] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [agentProfile, setAgentProfile] = useState(null);

  const fetchLayoutData = async () => {
    try {
      const data = await deliveryService.getDashboard();
      setIsOnDuty(data.is_on_duty);
      setAgentProfile(data);
    } catch (err) {
      console.error("Failed to load delivery profile data:", err);
    }

    try {
      const notifs = await deliveryService.getNotifications();
      setNotifications(notifs || []);
      setUnreadCount((notifs || []).filter(n => !n.is_read).length);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  useEffect(() => {
    fetchLayoutData();
  }, [location.pathname]);

  const handleToggleDuty = async () => {
    const newStatus = !isOnDuty;
    setIsOnDuty(newStatus);
    try {
      await deliveryService.updateAvailability(newStatus);
    } catch (err) {
      console.error("Duty toggle error:", err);
      setIsOnDuty(!newStatus); // revert on failure
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await deliveryService.markNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const isActive = (path) => location.pathname.includes(path);

  const agentName = user?.full_name || agentProfile?.agent_name || 'Delivery Partner';
  const initial = agentName.charAt(0).toUpperCase() || 'D';
  const vehicleSummary = agentProfile?.vehicle_type 
    ? `${agentProfile.vehicle_type} ${agentProfile.vehicle_number ? '• ' + agentProfile.vehicle_number : ''}`
    : 'Vehicle Details';

  return (
    <div className="delivery-mobile-frame">
      {/* TOP HEADER */}
      <header className="delivery-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Agent Avatar Circle */}
          <div 
            onClick={() => navigate('/dashboard/delivery/profile')}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-accent-delivery)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1rem',
              boxShadow: '0 2px 6px rgba(217, 119, 6, 0.25)',
              cursor: 'pointer',
              flexShrink: 0
            }}
            title="View Profile"
          >
            {initial}
          </div>

          <div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-main)', lineHeight: 1.2 }}>
              {agentName}
            </div>
            {/* Tappable Vehicle Details */}
            <button
              onClick={() => navigate('/dashboard/delivery/profile')}
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-accent-delivery)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                fontWeight: 500
              }}
              title="Edit Vehicle & License"
            >
              <span>{vehicleSummary}</span>
              <ChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* TOP ACTIONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Shift Duty Switch */}
          <button
            onClick={handleToggleDuty}
            className={`badge ${isOnDuty ? 'badge-success' : 'badge-neutral'}`}
            style={{
              cursor: 'pointer',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.75rem',
              fontWeight: 600,
              border: isOnDuty ? '1px solid #86efac' : '1px solid #cbd5e1'
            }}
            title={isOnDuty ? "Click to go off-duty" : "Click to go on-duty"}
          >
            <Power size={12} />
            <span>{isOnDuty ? t('onDuty', 'On Duty') : t('offDuty', 'Off Duty')}</span>
          </button>

          {/* Notification Bell */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="icon-btn"
            style={{ width: '36px', height: '36px', position: 'relative', border: 'var(--border-hairline)' }}
            title="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span 
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  backgroundColor: 'var(--color-danger)',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid var(--color-bg-surface)'
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Sign Out Button */}
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to sign out?")) {
                logout();
                navigate('/login/delivery');
              }
            }}
            className="icon-btn"
            style={{ width: '36px', height: '36px', border: 'var(--border-hairline)' }}
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* LANGUAGE STRIP */}
      <div style={{ padding: '6px 20px', backgroundColor: 'var(--color-bg-subtle)', borderBottom: 'var(--border-hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Truck size={12} color="var(--color-accent-delivery)" /> Farm2Home Dispatch Portal
        </span>
        <LanguageToggle />
      </div>

      {/* NOTIFICATIONS MODAL / DRAWER */}
      {showNotifications && (
        <div className="modal-overlay" onClick={() => setShowNotifications(false)}>
          <div 
            className="modal-card" 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="flex-between" style={{ marginBottom: '14px', borderBottom: 'var(--border-hairline)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={18} color="var(--color-accent-delivery)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{t('notifications', 'Notifications')}</h3>
                {unreadCount > 0 && (
                  <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                    {unreadCount} new
                  </span>
                )}
              </div>
              <button 
                onClick={() => setShowNotifications(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  alignSelf: 'flex-end',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-accent-delivery)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <CheckCheck size={14} /> {t('markAllRead', 'Mark all as read')}
              </button>
            )}

            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--color-text-muted)' }}>
                  <Bell size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                  <div style={{ fontSize: '0.85rem' }}>{t('noNotifications', 'No new notifications')}</div>
                </div>
              ) : (
                notifications.map((n) => (
                  <div 
                    key={n.id}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: n.is_read ? 'var(--color-bg-app)' : 'var(--color-accent-delivery-bg)',
                      border: n.is_read ? 'var(--border-hairline)' : '1px solid #fde68a',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: n.is_read ? 'var(--color-text-main)' : '#92400e' }}>
                        {n.title}
                      </div>
                      <span style={{ fontSize: '0.675rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', marginLeft: '6px' }}>
                        {n.created_at}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.35 }}>
                      {n.message}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MAIN VIEW */}
      <main style={{ flex: 1, padding: '16px 0', overflowY: 'auto', paddingBottom: '80px' }}>
        <Outlet context={{ isOnDuty, setIsOnDuty, refreshLayout: fetchLayoutData }} />
      </main>

      {/* BOTTOM NAVIGATION (5 TABS) */}
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
