import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { deliveryService } from '../services/deliveryService';
import { LanguageToggle } from '../components/common/LanguageToggle';
import {
  Truck,
  MapPin,
  Phone,
  Navigation,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Home,
  Map,
  RotateCcw,
  User,
  Bell,
  LogOut,
  Power,
  ShieldAlert
} from 'lucide-react';

export const DeliveryDashboard = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState('home');
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [stats, setStats] = useState({ total_deliveries_today: 12, completed_today: 9 });
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [upcomingDeliveries, setUpcomingDeliveries] = useState([]);
  const [expandedUpcoming, setExpandedUpcoming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const data = await deliveryService.getDashboard();
      setIsOnDuty(data.is_on_duty);
      setStats(data.stats);
      setActiveDelivery(data.active_delivery);
      setUpcomingDeliveries(data.upcoming_deliveries || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleToggleDuty = async () => {
    const newStatus = !isOnDuty;
    setIsOnDuty(newStatus);
    try {
      await deliveryService.toggleDuty(newStatus);
    } catch (err) {
      console.error(err);
    }
  };

  // State lifecycle for the single centerpiece button
  const handleSingleActionClick = async () => {
    if (!activeDelivery) return;
    setActionLoading(true);

    try {
      let nextStatus = '';
      if (activeDelivery.status === 'assigned') {
        nextStatus = 'accepted';
      } else if (activeDelivery.status === 'accepted') {
        nextStatus = 'picked_up';
      } else if (activeDelivery.status === 'picked_up') {
        nextStatus = 'out_for_delivery';
      } else if (activeDelivery.status === 'out_for_delivery') {
        nextStatus = 'delivered';
      }

      await deliveryService.updateStatus(activeDelivery.order_id, nextStatus);

      if (nextStatus === 'delivered') {
        setStats(prev => ({
          total_deliveries_today: prev.total_deliveries_today + 1,
          completed_today: prev.completed_today + 1
        }));
        setActiveDelivery(null);
      } else {
        setActiveDelivery(prev => ({ ...prev, status: nextStatus }));
      }
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const getActionButtonLabel = () => {
    if (!activeDelivery) return 'No Active Order';
    switch (activeDelivery.status) {
      case 'assigned':
        return 'Accept delivery task (₹' + activeDelivery.payout + ')';
      case 'accepted':
        return 'Arrived at Farm & Mark picked up';
      case 'picked_up':
        return 'Start delivery route (Out for delivery)';
      case 'out_for_delivery':
        return 'Confirm drop & Mark delivered ✓';
      default:
        return 'Delivery completed';
    }
  };

  return (
    <div className="delivery-mobile-frame">
      {/* TOP BAR: Name, on-duty status toggle switch, notification bell */}
      <header className="delivery-topbar">
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 600 }}>
            {user?.full_name || 'Murugan (Fleet #4421)'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Electric Scooter (TN-09-EV-4421)
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* On-Duty Switch */}
          <button
            onClick={handleToggleDuty}
            className={`badge ${isOnDuty ? 'badge-success' : 'badge-neutral'}`}
            style={{ cursor: 'pointer', padding: '6px 10px' }}
          >
            <Power size={12} />
            <span>{isOnDuty ? t('onDuty') : t('offDuty')}</span>
          </button>

          <div className="icon-btn" style={{ width: '34px', height: '34px' }}>
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

      {/* Language Quick Switcher */}
      <div style={{ padding: '8px 20px', backgroundColor: 'var(--color-bg-surface)', borderBottom: 'var(--border-hairline)', display: 'flex', justifyContent: 'flex-end' }}>
        <LanguageToggle />
      </div>

      <main style={{ flex: 1, padding: '16px 0' }}>
        {/* TODAY'S STATS: Exactly two numbers (Section 3 rule) */}
        <div className="stats-grid-2">
          <div className="stat-card-clean" style={{ padding: '14px' }}>
            <div className="stat-card-title" style={{ fontSize: '0.8125rem' }}>
              <Truck size={14} color="var(--color-accent-delivery)" />
              <span>{t('totalDeliveries')}</span>
            </div>
            <div className="stat-card-value" style={{ fontSize: '1.5rem' }}>
              {stats.total_deliveries_today}
            </div>
          </div>

          <div className="stat-card-clean" style={{ padding: '14px' }}>
            <div className="stat-card-title" style={{ fontSize: '0.8125rem' }}>
              <CheckCircle2 size={14} color="var(--color-success)" />
              <span>{t('completedSoFar')}</span>
            </div>
            <div className="stat-card-value" style={{ fontSize: '1.5rem', color: 'var(--color-success)' }}>
              {stats.completed_today}
            </div>
          </div>
        </div>

        {/* ACTIVE DELIVERY CARD (THE CENTERPIECE) */}
        {activeDelivery ? (
          <div className="active-job-centerpiece">
            {/* Header: Order ID + Estimated Payout */}
            <div className="flex-between">
              <div>
                <span className="badge badge-warning" style={{ fontWeight: 600 }}>ACTIVE DISPATCH</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, marginLeft: '8px' }}>
                  {activeDelivery.order_number}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-accent-delivery)' }}>
                  ₹{activeDelivery.payout}
                </span>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {activeDelivery.distance_km} km · ~{activeDelivery.est_time_mins} mins
                </div>
              </div>
            </div>

            {/* Route Map Preview Box */}
            <div style={{ height: '90px', backgroundColor: '#e2e8f0', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', border: 'var(--border-hairline)' }}>
              <div style={{ position: 'absolute', inset: 0, opacity: 0.15, backgroundImage: 'radial-gradient(#0f172a 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 2 }}>
                <Navigation size={18} color="var(--color-accent-delivery)" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>GPS live route navigation active</span>
              </div>
            </div>

            {/* Pickup Location (Green Pin) */}
            <div className="location-route-step">
              <div className="pin-icon-box pin-pickup">
                <MapPin size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-success)', textTransform: 'uppercase' }}>
                  1. {t('pickup')} (Farmer)
                </div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>{activeDelivery.pickup_name}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{activeDelivery.pickup_address}</div>
              </div>
              <a href={`tel:${activeDelivery.pickup_phone}`} className="icon-btn" style={{ width: '32px', height: '32px' }}>
                <Phone size={14} />
              </a>
            </div>

            {/* Drop Location (Red Pin) */}
            <div className="location-route-step">
              <div className="pin-icon-box pin-drop">
                <MapPin size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-danger)', textTransform: 'uppercase' }}>
                  2. {t('drop')} (Customer)
                </div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>{activeDelivery.drop_name}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{activeDelivery.drop_address}</div>
              </div>
              <a href={`tel:${activeDelivery.drop_phone}`} className="icon-btn" style={{ width: '32px', height: '32px' }}>
                <Phone size={14} />
              </a>
            </div>

            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-app)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
              📦 <b>Produce Package:</b> {activeDelivery.items_summary}
            </div>

            {/* ONE SINGLE LARGE ACTION BUTTON (The centerpiece decision point - Section 3) */}
            <button
              className="single-action-huge-btn"
              onClick={handleSingleActionClick}
              disabled={actionLoading}
            >
              {actionLoading ? 'Updating route...' : getActionButtonLabel()}
            </button>
          </div>
        ) : (
          <div style={{ margin: '0 20px 20px', padding: '32px 20px', backgroundColor: 'var(--color-bg-surface)', borderRadius: 'var(--radius-lg)', border: 'var(--border-hairline)', textAlign: 'center' }}>
            <CheckCircle2 size={36} color="var(--color-success)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>All Active Tasks Completed!</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Waiting for upcoming harvest pickups from nearby farms.
            </p>
          </div>
        )}

        {/* UPCOMING DELIVERIES: Expandable list below, never competing visually with active job */}
        <div style={{ padding: '0 20px' }}>
          <div
            onClick={() => setExpandedUpcoming(!expandedUpcoming)}
            className="flex-between"
            style={{ padding: '12px 16px', backgroundColor: 'var(--color-bg-surface)', border: 'var(--border-hairline)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="var(--color-text-muted)" />
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                {t('upcomingJobs')} ({upcomingDeliveries.length})
              </span>
            </div>
            {expandedUpcoming ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>

          {expandedUpcoming && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {upcomingDeliveries.map((job) => (
                <div key={job.order_id} style={{ padding: '12px 16px', backgroundColor: 'var(--color-bg-surface)', border: 'var(--border-hairline)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{job.order_number}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {job.pickup_area} → {job.drop_area} ({job.distance_km} km)
                    </div>
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--color-accent-delivery)', fontSize: '0.875rem' }}>
                    ₹{job.payout}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* BOTTOM TAB BAR: Home, Route, History, Profile (always reachable with one thumb) */}
      <nav className="delivery-bottom-nav">
        <div
          className={`tab-nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <Home size={20} />
          <span>{t('home')}</span>
        </div>

        <div
          className={`tab-nav-item ${activeTab === 'route' ? 'active' : ''}`}
          onClick={() => setActiveTab('route')}
        >
          <Map size={20} />
          <span>{t('route')}</span>
        </div>

        <div
          className={`tab-nav-item ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <RotateCcw size={20} />
          <span>{t('history')}</span>
        </div>

        <div
          className={`tab-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <User size={20} />
          <span>{t('profile')}</span>
        </div>
      </nav>
    </div>
  );
};
