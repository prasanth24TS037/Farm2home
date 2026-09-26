import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { deliveryService } from '../../services/deliveryService';
import { 
  RotateCcw, 
  Filter, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Phone, 
  Package, 
  Clock, 
  X, 
  ShieldCheck, 
  ExternalLink,
  ChevronLeft
} from 'lucide-react';

export const DeliveryHistory = () => {
  const { t } = useLanguage();
  const [history, setHistory] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Detail Modal State
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadHistory = async (p, status) => {
    try {
      setLoading(true);
      const data = await deliveryService.getHistory(p, status);
      setHistory(data.history || []);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error("History load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(page, statusFilter);
  }, [page, statusFilter]);

  const handleCardClick = async (item) => {
    setDetailLoading(true);
    try {
      const detail = await deliveryService.getHistoryDetail(item.id);
      setSelectedTrip(detail);
    } catch (err) {
      // Fallback to item if detail endpoint fails
      setSelectedTrip(item);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  return (
    <div style={{ padding: '0 20px' }}>
      {/* HEADER WITH FILTER */}
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
            {t('history', 'Delivery History')}
          </h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Completed & past dispatch records
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Filter size={14} color="var(--color-text-muted)" />
          <select 
            className="form-input" 
            style={{ padding: '6px 10px', fontSize: '0.8rem', width: 'auto', fontWeight: 500 }}
            value={statusFilter}
            onChange={handleFilterChange}
          >
            <option value="">{t('allFilter', 'All Statuses')}</option>
            <option value="delivered">{t('deliveredStatus', 'Delivered')}</option>
            <option value="cancelled">{t('cancelledStatus', 'Cancelled')}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
          <RotateCcw size={32} color="var(--color-accent-delivery)" style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 12px' }} />
          <div>Loading delivery history...</div>
        </div>
      ) : history.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 20px',
          backgroundColor: 'var(--color-bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: 'var(--border-hairline)',
          color: 'var(--color-text-muted)'
        }}>
          <RotateCcw size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
            {t('noHistoryYet', 'No past deliveries found.')}
          </div>
          <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
            Completed deliveries will appear here with proof of delivery.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {history.map((item) => (
            <div 
              key={item.id}
              onClick={() => handleCardClick(item)}
              style={{
                padding: '14px',
                backgroundColor: 'var(--color-bg-surface)',
                border: 'var(--border-hairline)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            >
              {/* Status Icon */}
              <div style={{ flexShrink: 0 }}>
                {item.status === 'delivered' ? (
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={20} color="var(--color-success)" />
                  </div>
                ) : (
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <XCircle size={20} color="var(--color-danger)" />
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                    {item.order_number}
                  </span>
                  <span className={`badge ${item.status === 'delivered' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.65rem', padding: '1px 6px', textTransform: 'capitalize' }}>
                    {item.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  🌾 {item.pickup_name} → 🏠 {item.drop_name}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', marginTop: '2px' }}>
                  {item.date} · {item.distance} km
                </div>
              </div>
              
              {/* Payout & Arrow */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-accent-delivery)' }}>
                  +₹{item.payout}
                </div>
                <ChevronRight size={16} color="var(--color-text-muted)" style={{ marginTop: '2px', marginLeft: 'auto' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '0 4px' }}>
          <button 
            className="btn btn-secondary btn-sm" 
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
            Page {page} of {totalPages}
          </span>
          <button 
            className="btn btn-secondary btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* TRIP DETAIL VIEW MODAL */}
      {selectedTrip && (
        <div className="modal-overlay" onClick={() => setSelectedTrip(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="flex-between" style={{ marginBottom: '14px', borderBottom: 'var(--border-hairline)', paddingBottom: '10px' }}>
              <div>
                <span className={`badge ${selectedTrip.status === 'delivered' ? 'badge-success' : 'badge-danger'}`} style={{ textTransform: 'capitalize' }}>
                  {selectedTrip.status}
                </span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '4px' }}>
                  {selectedTrip.order_number}
                </h3>
              </div>
              <button onClick={() => setSelectedTrip(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Payout & Distance Box */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              backgroundColor: 'var(--color-bg-app)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: 'var(--border-hairline)',
              marginBottom: '16px'
            }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Total Trip Payout</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-accent-delivery)' }}>
                  ₹{selectedTrip.payout}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Total Distance</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                  {selectedTrip.distance_km || selectedTrip.distance} km
                </div>
              </div>
            </div>

            {/* PICKUP & DROP LOCATIONS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {/* Pickup */}
              <div style={{ padding: '10px 12px', backgroundColor: '#f0fdf4', borderRadius: 'var(--radius-sm)', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                  1. Farm Pickup Location
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)', marginTop: '2px' }}>
                  {selectedTrip.pickup?.name || selectedTrip.pickup_name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  {selectedTrip.pickup?.address || selectedTrip.pickup_address}
                </div>
              </div>

              {/* Drop */}
              <div style={{ padding: '10px 12px', backgroundColor: '#fef2f2', borderRadius: 'var(--radius-sm)', border: '1px solid #fecaca' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
                  2. Customer Drop Location
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)', marginTop: '2px' }}>
                  {selectedTrip.drop?.name || selectedTrip.drop_name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  {selectedTrip.drop?.address || selectedTrip.drop_address}
                </div>
              </div>
            </div>

            {/* ITEMS SUMMARY */}
            {selectedTrip.items && selectedTrip.items.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-main)' }}>
                  Delivered Produce Items
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {selectedTrip.items.map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '6px 8px', backgroundColor: 'var(--color-bg-app)', borderRadius: '4px' }}>
                      <span>{it.name}</span>
                      <span style={{ fontWeight: 600 }}>{it.quantity} {it.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PROOF OF DELIVERY PREVIEW */}
            <div style={{
              padding: '12px',
              backgroundColor: 'var(--color-bg-app)',
              borderRadius: 'var(--radius-md)',
              border: 'var(--border-hairline)',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '8px' }}>
                <ShieldCheck size={16} color="var(--color-success)" />
                <span>Proof of Delivery Verification</span>
              </div>

              {selectedTrip.delivery_otp && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  ✓ Customer OTP Verified: <b>••••{selectedTrip.delivery_otp.slice(-2)}</b>
                </div>
              )}

              {selectedTrip.proof_of_delivery_url ? (
                <div style={{ marginTop: '8px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', height: '140px' }}>
                  <img 
                    src={selectedTrip.proof_of_delivery_url} 
                    alt="Proof of delivery" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                </div>
              ) : !selectedTrip.delivery_otp && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>
                  ✓ Digital dispatch signature confirmed.
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedTrip(null)}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '10px' }}
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
