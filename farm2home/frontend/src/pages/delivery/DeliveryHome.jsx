import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { deliveryService } from '../../services/deliveryService';
import { Truck, MapPin, Phone, Navigation, CheckCircle2, Clock, ChevronDown, ChevronUp, X, Camera } from 'lucide-react';

export const DeliveryHome = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState({ total_deliveries_today: 0, completed_today: 0 });
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [upcomingDeliveries, setUpcomingDeliveries] = useState([]);
  const [expandedUpcoming, setExpandedUpcoming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [showProofModal, setShowProofModal] = useState(false);
  const [deliveryToComplete, setDeliveryToComplete] = useState(null);
  const [proofType, setProofType] = useState('otp'); // 'otp' or 'photo'
  const [otpValue, setOtpValue] = useState('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const data = await deliveryService.getDashboard();
      setStats(data.stats);
      setActiveDeliveries(data.active_deliveries || []);
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
        setShowProofModal(true);
        setActionLoading(false);
        return;
      }

      await deliveryService.updateStatus(delivery.delivery_id || delivery.order_id, nextStatus);
      fetchDashboard();
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (delivery) => {
    if (!window.confirm("Are you sure you want to reject this delivery?")) return;
    try {
      await deliveryService.rejectDelivery(delivery.delivery_id || delivery.order_id);
      fetchDashboard();
    } catch (err) {
      alert('Failed to reject delivery');
    }
  };

  const submitProofAndComplete = async () => {
    if (!deliveryToComplete) return;
    setActionLoading(true);
    try {
      if (proofType === 'otp' && otpValue.length < 4) {
        alert("Please enter a valid OTP");
        return;
      }
      
      const payload = {
        status: 'delivered',
        proofUrl: proofType === 'photo' ? 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80' : null,
        otp: proofType === 'otp' ? otpValue : null
      };

      await deliveryService.updateStatus(deliveryToComplete.delivery_id || deliveryToComplete.order_id, payload.status, payload.proofUrl, payload.otp);
      setShowProofModal(false);
      setDeliveryToComplete(null);
      setOtpValue('');
      fetchDashboard();
    } catch (err) {
      alert('Failed to complete delivery');
    } finally {
      setActionLoading(false);
    }
  };

  const getActionButtonLabel = (delivery) => {
    switch (delivery.status) {
      case 'assigned':
        return 'Accept delivery task (₹' + delivery.payout + ')';
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

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;

  return (
    <>
      {/* TODAY'S STATS */}
      <div className="stats-grid-2">
        <div className="stat-card-clean" style={{ padding: '14px' }}>
          <div className="stat-card-title" style={{ fontSize: '0.8125rem' }}>
            <Truck size={14} color="var(--color-accent-delivery)" />
            <span>{t('totalDeliveries', 'Total Deliveries')}</span>
          </div>
          <div className="stat-card-value" style={{ fontSize: '1.5rem' }}>
            {stats.total_deliveries_today}
          </div>
        </div>

        <div className="stat-card-clean" style={{ padding: '14px' }}>
          <div className="stat-card-title" style={{ fontSize: '0.8125rem' }}>
            <CheckCircle2 size={14} color="var(--color-success)" />
            <span>{t('completedSoFar', 'Completed')}</span>
          </div>
          <div className="stat-card-value" style={{ fontSize: '1.5rem', color: 'var(--color-success)' }}>
            {stats.completed_today}
          </div>
        </div>
      </div>

      {/* ACTIVE DELIVERIES LIST (Multi-stop batching) */}
      {activeDeliveries.length > 0 ? (
        activeDeliveries.map((delivery) => (
          <div key={delivery.order_id} className="active-job-centerpiece" style={{ marginBottom: '16px' }}>
            {/* Header: Order ID + Estimated Payout */}
            <div className="flex-between">
              <div>
                <span className={`badge ${delivery.status === 'assigned' ? 'badge-warning' : 'badge-success'}`} style={{ fontWeight: 600 }}>
                  {delivery.status === 'assigned' ? 'NEW ASSIGNMENT' : 'ACTIVE DISPATCH'}
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, marginLeft: '8px' }}>
                  {delivery.order_number}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-accent-delivery)' }}>
                  ₹{delivery.payout}
                </span>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {delivery.distance_km} km · ~{delivery.est_time_mins} mins
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

            {/* Pickup Location */}
            <div className="location-route-step">
              <div className="pin-icon-box pin-pickup">
                <MapPin size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-success)', textTransform: 'uppercase' }}>
                  1. {t('pickup', 'Pickup')} (Farm)
                </div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>{delivery.pickup_name}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{delivery.pickup_address}</div>
              </div>
              <a href={`tel:${delivery.pickup_phone}`} className="icon-btn" style={{ width: '32px', height: '32px' }}>
                <Phone size={14} />
              </a>
            </div>

            {/* Drop Location */}
            <div className="location-route-step">
              <div className="pin-icon-box pin-drop">
                <MapPin size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-danger)', textTransform: 'uppercase' }}>
                  2. {t('drop', 'Drop')} (Customer)
                </div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>{delivery.drop_name}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{delivery.drop_address}</div>
              </div>
              <a href={`tel:${delivery.drop_phone}`} className="icon-btn" style={{ width: '32px', height: '32px' }}>
                <Phone size={14} />
              </a>
            </div>

            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-app)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', marginBottom: '12px' }}>
              📦 <b>Produce Package:</b> {delivery.items_summary}
            </div>

            {/* ACTION BUTTONS */}
            {delivery.status === 'assigned' ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="single-action-huge-btn"
                  style={{ flex: 1, backgroundColor: 'var(--color-success)', color: 'white' }}
                  onClick={() => handleActionClick(delivery)}
                  disabled={actionLoading}
                >
                  Accept
                </button>
                <button
                  className="single-action-huge-btn"
                  style={{ flex: 1, backgroundColor: 'var(--color-bg-surface)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}
                  onClick={() => handleReject(delivery)}
                  disabled={actionLoading}
                >
                  Reject
                </button>
              </div>
            ) : (
              <button
                className="single-action-huge-btn"
                onClick={() => handleActionClick(delivery)}
                disabled={actionLoading}
              >
                {actionLoading ? 'Updating...' : getActionButtonLabel(delivery)}
              </button>
            )}
          </div>
        ))
      ) : (
        <div style={{ margin: '0 20px 20px', padding: '32px 20px', backgroundColor: 'var(--color-bg-surface)', borderRadius: 'var(--radius-lg)', border: 'var(--border-hairline)', textAlign: 'center' }}>
          <CheckCircle2 size={36} color="var(--color-success)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>All Clear!</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            No active deliveries right now. Take a break or wait for new assignments.
          </p>
        </div>
      )}

      {/* UPCOMING DELIVERIES */}
      <div style={{ padding: '0 20px' }}>
        <div
          onClick={() => setExpandedUpcoming(!expandedUpcoming)}
          className="flex-between"
          style={{ padding: '12px 16px', backgroundColor: 'var(--color-bg-surface)', border: 'var(--border-hairline)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} color="var(--color-text-muted)" />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
              {t('upcomingJobs', 'Upcoming Jobs')} ({upcomingDeliveries.length})
            </span>
          </div>
          {expandedUpcoming ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>

        {expandedUpcoming && (
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {upcomingDeliveries.length === 0 && (
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '10px' }}>
                No upcoming jobs
              </div>
            )}
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

      {/* PROOF OF DELIVERY MODAL */}
      {showProofModal && deliveryToComplete && (
        <div className="modal-overlay" onClick={() => setShowProofModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="flex-between" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Proof of Delivery</h3>
              <button onClick={() => setShowProofModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Please provide proof of delivery to complete order {deliveryToComplete.order_number}.
            </p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button 
                className={`btn ${proofType === 'otp' ? 'btn-accent-delivery' : 'btn-secondary'}`} 
                style={{ flex: 1 }}
                onClick={() => setProofType('otp')}
              >
                Enter OTP
              </button>
              <button 
                className={`btn ${proofType === 'photo' ? 'btn-accent-delivery' : 'btn-secondary'}`} 
                style={{ flex: 1 }}
                onClick={() => setProofType('photo')}
              >
                <Camera size={16} style={{ marginRight: '4px' }} /> Photo
              </button>
            </div>

            {proofType === 'otp' ? (
              <div className="form-group">
                <label className="form-label">Customer OTP</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Enter 4 or 6 digit OTP"
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value)}
                  maxLength={6}
                />
              </div>
            ) : (
              <div style={{ height: '150px', backgroundColor: '#f1f5f9', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e1', marginBottom: '16px', cursor: 'pointer' }}>
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                  <Camera size={32} style={{ margin: '0 auto 8px' }} />
                  <span style={{ fontSize: '0.875rem' }}>Tap to capture photo</span>
                </div>
              </div>
            )}

            <button 
              className="btn btn-accent-delivery" 
              style={{ width: '100%', padding: '12px' }}
              onClick={submitProofAndComplete}
              disabled={actionLoading}
            >
              {actionLoading ? 'Submitting...' : 'Mark Delivered'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
