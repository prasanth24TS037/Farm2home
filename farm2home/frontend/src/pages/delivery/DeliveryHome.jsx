import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { deliveryService } from '../../services/deliveryService';
import { 
  Truck, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Navigation, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Camera, 
  AlertCircle, 
  Check, 
  ExternalLink,
  Package,
  ShieldCheck,
  Power
} from 'lucide-react';

export const DeliveryHome = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const outletContext = useOutletContext() || {};
  const { isOnDuty, setIsOnDuty, refreshLayout } = outletContext;

  const [stats, setStats] = useState({ total_deliveries_today: 0, completed_today: 0 });
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [upcomingDeliveries, setUpcomingDeliveries] = useState([]);
  const [expandedUpcoming, setExpandedUpcoming] = useState(true);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Proof of delivery modal state
  const [showProofModal, setShowProofModal] = useState(false);
  const [deliveryToComplete, setDeliveryToComplete] = useState(null);
  const [proofType, setProofType] = useState('otp'); // 'otp' or 'photo'
  const [otpValue, setOtpValue] = useState('');
  const [photoCaptured, setPhotoCaptured] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const data = await deliveryService.getDashboard();
      if (data.stats) setStats(data.stats);
      setActiveDeliveries(data.active_deliveries || []);
      setUpcomingDeliveries(data.upcoming_deliveries || []);
      if (setIsOnDuty && typeof data.is_on_duty === 'boolean') {
        setIsOnDuty(data.is_on_duty);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleTurnOnDuty = async () => {
    try {
      await deliveryService.updateAvailability(true);
      if (setIsOnDuty) setIsOnDuty(true);
      if (refreshLayout) refreshLayout();
      fetchDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  const handleActionClick = async (delivery) => {
    setActionLoading(true);

    try {
      let nextStatus = '';
      if (delivery.status === 'assigned') {
        nextStatus = 'accepted';
      } else if (delivery.status === 'accepted') {
        nextStatus = 'picked_up';
      } else if (delivery.status === 'picked_up') {
        nextStatus = 'out_for_delivery';
      } else if (delivery.status === 'out_for_delivery') {
        // Open Proof of Delivery Modal
        setDeliveryToComplete(delivery);
        setOtpValue('');
        setPhotoCaptured(false);
        setPhotoPreview(null);
        setShowProofModal(true);
        setActionLoading(false);
        return;
      }

      await deliveryService.updateStatus(delivery.delivery_id || delivery.order_id, nextStatus);
      await fetchDashboard();
      if (refreshLayout) refreshLayout();
    } catch (err) {
      alert('Failed to update status. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (delivery) => {
    if (!window.confirm("Are you sure you want to reject this delivery? It will return to the pool for other agents.")) return;
    setActionLoading(true);
    try {
      await deliveryService.rejectDelivery(delivery.delivery_id || delivery.order_id);
      await fetchDashboard();
      if (refreshLayout) refreshLayout();
    } catch (err) {
      alert('Failed to reject delivery.');
    } finally {
      setActionLoading(false);
    }
  };

  const submitProofAndComplete = async () => {
    if (!deliveryToComplete) return;
    setActionLoading(true);
    try {
      if (proofType === 'otp') {
        if (!otpValue || otpValue.trim().length < 4) {
          alert("Please enter a valid 4 or 6 digit customer delivery OTP");
          setActionLoading(false);
          return;
        }
      }

      const payload = {
        status: 'delivered',
        proofUrl: proofType === 'photo' 
          ? (photoPreview || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80') 
          : null,
        otp: proofType === 'otp' ? otpValue.trim() : null
      };

      await deliveryService.updateStatus(
        deliveryToComplete.delivery_id || deliveryToComplete.order_id, 
        payload.status, 
        payload.proofUrl, 
        payload.otp
      );

      setShowProofModal(false);
      setDeliveryToComplete(null);
      setOtpValue('');
      setPhotoCaptured(false);
      setPhotoPreview(null);

      await fetchDashboard();
      if (refreshLayout) refreshLayout();
    } catch (err) {
      alert('Failed to complete delivery. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const openInMaps = (lat, lng) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'assigned':
        return <span className="badge badge-warning" style={{ fontWeight: 600 }}>{t('newAssignment', 'NEW ASSIGNMENT')}</span>;
      case 'accepted':
        return <span className="badge badge-success" style={{ fontWeight: 600 }}>ACCEPTED • EN ROUTE TO FARM</span>;
      case 'picked_up':
        return <span className="badge badge-success" style={{ fontWeight: 600 }}>PRODUCE PICKED UP</span>;
      case 'out_for_delivery':
        return <span className="badge badge-warning" style={{ fontWeight: 600, backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>OUT FOR DELIVERY</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  const getActionButtonLabel = (delivery) => {
    switch (delivery.status) {
      case 'assigned':
        return `${t('accept', 'Accept')} (₹${delivery.payout})`;
      case 'accepted':
        return 'Arrived at Farm & Mark Picked Up';
      case 'picked_up':
        return 'Start Delivery Route (Out for Delivery)';
      case 'out_for_delivery':
        return 'Confirm Drop & Mark Delivered ✓';
      default:
        return 'Delivery Completed';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <Truck size={32} color="var(--color-accent-delivery)" style={{ animation: 'bounce 1s infinite', margin: '0 auto 12px' }} />
        <div>Loading delivery dashboard...</div>
      </div>
    );
  }

  return (
    <>
      {/* OFF DUTY ALERT BANNER */}
      {!isOnDuty && (
        <div style={{
          margin: '0 20px 16px',
          padding: '14px 16px',
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={20} color="#b45309" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#92400e' }}>
                You are currently Off Duty
              </div>
              <div style={{ fontSize: '0.725rem', color: '#b45309' }}>
                Turn on duty to receive real-time farm delivery dispatches.
              </div>
            </div>
          </div>
          <button
            onClick={handleTurnOnDuty}
            className="btn btn-sm"
            style={{
              backgroundColor: 'var(--color-success)',
              color: '#ffffff',
              border: 'none',
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0
            }}
          >
            <Power size={12} /> Go On Duty
          </button>
        </div>
      )}

      {/* TODAY'S STATS CARDS */}
      <div className="stats-grid-2">
        <div className="stat-card-clean" style={{ padding: '14px' }}>
          <div className="stat-card-title" style={{ fontSize: '0.8125rem' }}>
            <Truck size={15} color="var(--color-accent-delivery)" />
            <span>{t('totalDeliveries', 'Total Deliveries Today')}</span>
          </div>
          <div className="stat-card-value" style={{ fontSize: '1.65rem', color: 'var(--color-text-main)', marginTop: '4px' }}>
            {stats.total_deliveries_today}
          </div>
        </div>

        <div className="stat-card-clean" style={{ padding: '14px' }}>
          <div className="stat-card-title" style={{ fontSize: '0.8125rem' }}>
            <CheckCircle2 size={15} color="var(--color-success)" />
            <span>{t('completedSoFar', 'Completed So Far')}</span>
          </div>
          <div className="stat-card-value" style={{ fontSize: '1.65rem', color: 'var(--color-success)', marginTop: '4px' }}>
            {stats.completed_today}
          </div>
        </div>
      </div>

      {/* ACTIVE DELIVERIES LIST */}
      {activeDeliveries.length > 0 ? (
        activeDeliveries.map((delivery, index) => (
          <div key={delivery.delivery_id || delivery.order_id || index} className="active-job-centerpiece">
            {/* Header: Order ID + Status + Payout */}
            <div className="flex-between">
              <div>
                {getStatusBadge(delivery.status)}
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '4px' }}>
                  {delivery.order_number}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-accent-delivery)' }}>
                  ₹{delivery.payout}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {delivery.distance_km} km · ~{delivery.est_time_mins} mins
                </div>
              </div>
            </div>

            {/* GPS Live Navigation Box */}
            <div 
              onClick={() => openInMaps(
                delivery.status === 'assigned' || delivery.status === 'accepted' ? delivery.pickup_lat : delivery.drop_lat,
                delivery.status === 'assigned' || delivery.status === 'accepted' ? delivery.pickup_lng : delivery.drop_lng
              )}
              style={{
                height: '75px',
                backgroundColor: '#f1f5f9',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}
              title="Click to open Google Maps navigation"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-accent-delivery-bg)',
                  border: '1px solid #fde68a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Navigation size={18} color="var(--color-accent-delivery)" />
                </div>
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                    {delivery.status === 'assigned' || delivery.status === 'accepted' ? 'Navigate to Farm Pickup' : 'Navigate to Customer Drop'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    Tap to open Turn-by-Turn GPS Maps
                  </div>
                </div>
              </div>
              <ExternalLink size={16} color="var(--color-accent-delivery)" />
            </div>

            {/* STEP 1: PICKUP FARM */}
            <div className="location-route-step">
              <div className="pin-icon-box pin-pickup">
                <MapPin size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  1. {t('pickup', 'Pickup')} ({t('farm', 'Farm')})
                </div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                  {delivery.pickup_name}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  {delivery.pickup_address}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <a 
                  href={`tel:${delivery.pickup_phone}`} 
                  className="icon-btn" 
                  style={{ width: '34px', height: '34px', backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#16a34a' }}
                  title="Call Farmer"
                >
                  <Phone size={14} />
                </a>
                <a 
                  href={`sms:${delivery.pickup_phone}?body=Hello, I am your Farm2Home delivery partner for order ${delivery.order_number}.`} 
                  className="icon-btn" 
                  style={{ width: '34px', height: '34px', backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#16a34a' }}
                  title="Message Farmer"
                >
                  <MessageSquare size={14} />
                </a>
              </div>
            </div>

            {/* STEP 2: DROP CUSTOMER */}
            <div className="location-route-step">
              <div className="pin-icon-box pin-drop">
                <MapPin size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--color-danger)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  2. {t('drop', 'Drop')} ({t('customer', 'Customer')})
                </div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                  {delivery.drop_name}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  {delivery.drop_address}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <a 
                  href={`tel:${delivery.drop_phone}`} 
                  className="icon-btn" 
                  style={{ width: '34px', height: '34px', backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}
                  title="Call Customer"
                >
                  <Phone size={14} />
                </a>
                <a 
                  href={`sms:${delivery.drop_phone}?body=Hello, your Farm2Home harvest order ${delivery.order_number} is on the way!`} 
                  className="icon-btn" 
                  style={{ width: '34px', height: '34px', backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}
                  title="Message Customer"
                >
                  <MessageSquare size={14} />
                </a>
              </div>
            </div>

            {/* PACKAGE ITEMS SUMMARY */}
            <div style={{
              fontSize: '0.8125rem',
              color: 'var(--color-text-main)',
              backgroundColor: 'var(--color-bg-app)',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              border: 'var(--border-hairline)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Package size={16} color="var(--color-accent-delivery)" style={{ flexShrink: 0 }} />
              <div>
                <span style={{ fontWeight: 600 }}>Harvest Items: </span>
                <span style={{ color: 'var(--color-text-muted)' }}>{delivery.items_summary}</span>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            {delivery.status === 'assigned' ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="single-action-huge-btn"
                  style={{ flex: 1.2, backgroundColor: 'var(--color-success)', color: '#ffffff' }}
                  onClick={() => handleActionClick(delivery)}
                  disabled={actionLoading}
                >
                  <Check size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  {t('accept', 'Accept Task')} (₹{delivery.payout})
                </button>
                <button
                  className="single-action-huge-btn"
                  style={{ flex: 0.8, backgroundColor: 'var(--color-bg-surface)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}
                  onClick={() => handleReject(delivery)}
                  disabled={actionLoading}
                >
                  <X size={18} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  {t('reject', 'Reject')}
                </button>
              </div>
            ) : (
              <button
                className="single-action-huge-btn"
                onClick={() => handleActionClick(delivery)}
                disabled={actionLoading}
                style={{
                  backgroundColor: delivery.status === 'out_for_delivery' ? '#16a34a' : 'var(--color-accent-delivery)',
                  boxShadow: '0 4px 12px rgba(217, 119, 6, 0.2)'
                }}
              >
                {actionLoading ? 'Updating Status...' : getActionButtonLabel(delivery)}
              </button>
            )}
          </div>
        ))
      ) : (
        /* ALL CLEAR EMPTY STATE (Shown strictly when 0 active deliveries) */
        <div style={{
          margin: '0 20px 20px',
          padding: '36px 20px',
          backgroundColor: 'var(--color-bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: 'var(--border-hairline)',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-success-bg)',
            border: '1px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <CheckCircle2 size={36} color="var(--color-success)" />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
            {t('allClear', 'All Clear!')}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '6px', maxWidth: '300px', margin: '6px auto 0', lineHeight: 1.4 }}>
            {t('noActiveDeliveries', 'No active deliveries right now. Take a break or wait for new assignments.')}
          </p>
        </div>
      )}

      {/* UPCOMING POOL DELIVERIES ACCORDION */}
      <div style={{ padding: '0 20px' }}>
        <div
          onClick={() => setExpandedUpcoming(!expandedUpcoming)}
          className="flex-between"
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--color-bg-surface)',
            border: 'var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            transition: 'background-color var(--transition-fast)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={18} color="var(--color-accent-delivery)" />
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                {t('upcomingDeliveries', 'Upcoming Deliveries')}
              </span>
              <span style={{
                marginLeft: '8px',
                fontSize: '0.725rem',
                backgroundColor: 'var(--color-accent-delivery-bg)',
                color: 'var(--color-accent-delivery)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 600
              }}>
                {upcomingDeliveries.length} available
              </span>
            </div>
          </div>
          {expandedUpcoming ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>

        {expandedUpcoming && (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {upcomingDeliveries.length === 0 ? (
              <div style={{
                fontSize: '0.8125rem',
                color: 'var(--color-text-muted)',
                textAlign: 'center',
                padding: '16px',
                backgroundColor: 'var(--color-bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: 'var(--border-hairline)'
              }}>
                No upcoming assignments currently waiting in the pool.
              </div>
            ) : (
              upcomingDeliveries.map((job) => (
                <div
                  key={job.delivery_id || job.order_id}
                  style={{
                    padding: '14px 16px',
                    backgroundColor: 'var(--color-bg-surface)',
                    border: 'var(--border-hairline)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-main)' }}>
                      {job.order_number}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      🌾 <b>{job.pickup_area}</b> → 🏠 <b>{job.drop_area}</b>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', marginTop: '2px' }}>
                      {job.distance_km} km estimate
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-accent-delivery)', fontSize: '1rem' }}>
                      ₹{job.payout}
                    </span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-success)', fontWeight: 500 }}>
                      Pool Ready
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* PROOF OF DELIVERY MODAL */}
      {showProofModal && deliveryToComplete && (
        <div className="modal-overlay" onClick={() => setShowProofModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="flex-between" style={{ marginBottom: '14px', borderBottom: 'var(--border-hairline)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="var(--color-success)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                  {t('proofOfDelivery', 'Proof of Delivery')}
                </h3>
              </div>
              <button onClick={() => setShowProofModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={18} />
              </button>
            </div>
            
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '16px', lineHeight: 1.4 }}>
              Order <b>{deliveryToComplete.order_number}</b> at {deliveryToComplete.drop_name}'s location. Confirm with OTP or photo to complete payout.
            </p>

            {/* TAB SELECTOR: OTP vs PHOTO */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button 
                className="btn" 
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  backgroundColor: proofType === 'otp' ? 'var(--color-accent-delivery)' : 'var(--color-bg-subtle)',
                  color: proofType === 'otp' ? '#ffffff' : 'var(--color-text-main)',
                  border: proofType === 'otp' ? 'none' : 'var(--border-hairline)'
                }}
                onClick={() => setProofType('otp')}
              >
                {t('enterOtp', 'Enter Customer OTP')}
              </button>
              <button 
                className="btn" 
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  backgroundColor: proofType === 'photo' ? 'var(--color-accent-delivery)' : 'var(--color-bg-subtle)',
                  color: proofType === 'photo' ? '#ffffff' : 'var(--color-text-main)',
                  border: proofType === 'photo' ? 'none' : 'var(--border-hairline)'
                }}
                onClick={() => setProofType('photo')}
              >
                <Camera size={15} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                {t('capturePhoto', 'Take Photo')}
              </button>
            </div>

            {proofType === 'otp' ? (
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  {t('customerOtp', 'Customer Delivery Verification OTP')}
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Enter 4-digit OTP (e.g. 1234 or 4421)"
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value)}
                  maxLength={6}
                  style={{
                    fontSize: '1.25rem',
                    letterSpacing: '4px',
                    textAlign: 'center',
                    fontWeight: 700,
                    padding: '12px'
                  }}
                  autoFocus
                />
                <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', marginTop: '6px', textAlign: 'center' }}>
                  Ask customer for the OTP sent via SMS/App (Demo: enter <b>1234</b> or <b>4421</b>).
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                {photoCaptured ? (
                  <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid #bbf7d0', height: '160px', backgroundColor: '#000' }}>
                    <img 
                      src={photoPreview || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80"} 
                      alt="Proof of delivery" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem' }}>
                      ✓ Photo Captured
                    </div>
                    <button
                      onClick={() => { setPhotoCaptured(false); setPhotoPreview(null); }}
                      style={{ position: 'absolute', top: '8px', right: '8px', background: '#ffffff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => {
                      setPhotoCaptured(true);
                      setPhotoPreview("https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80");
                    }}
                    style={{
                      height: '140px',
                      backgroundColor: '#f8fafc',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px dashed #cbd5e1',
                      cursor: 'pointer',
                      transition: 'border-color var(--transition-fast)'
                    }}
                  >
                    <Camera size={32} color="var(--color-accent-delivery)" style={{ marginBottom: '8px' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                      Tap to simulate camera photo capture
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      Takes photo of package at doorstep
                    </span>
                  </div>
                )}
              </div>
            )}

            <button 
              className="btn btn-accent-delivery" 
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '1rem',
                fontWeight: 700,
                backgroundColor: 'var(--color-success)',
                color: '#ffffff'
              }}
              onClick={submitProofAndComplete}
              disabled={actionLoading}
            >
              {actionLoading ? 'Verifying & Completing...' : t('markDelivered', 'Confirm & Complete Delivery ✓')}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
