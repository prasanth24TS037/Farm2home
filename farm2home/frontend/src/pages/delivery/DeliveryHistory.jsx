import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { deliveryService } from '../../services/deliveryService';
import { RotateCcw, Filter, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';

export const DeliveryHistory = () => {
  const { t } = useLanguage();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const loadHistory = async (p, status) => {
    try {
      setLoading(true);
      const data = await deliveryService.getHistory(p, status);
      setHistory(data.history);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(page, statusFilter);
  }, [page, statusFilter]);

  const handleFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  return (
    <div style={{ padding: '0 20px' }}>
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{t('history', 'Delivery History')}</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="var(--color-text-muted)" />
          <select 
            className="form-input" 
            style={{ padding: '4px 8px', fontSize: '0.875rem', width: 'auto' }}
            value={statusFilter}
            onChange={handleFilterChange}
          >
            <option value="">All</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
      ) : history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
          <RotateCcw size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <div>No past deliveries found.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {history.map(item => (
            <div key={item.id} style={{ padding: '12px', backgroundColor: 'var(--color-bg-surface)', border: 'var(--border-hairline)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flexShrink: 0 }}>
                {item.status === 'delivered' ? (
                  <CheckCircle2 size={24} color="var(--color-success)" />
                ) : (
                  <XCircle size={24} color="var(--color-danger)" />
                )}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{item.order_number}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{new Date(item.date).toLocaleDateString()}</span>
                  <span>{item.distance} km</span>
                </div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-accent-delivery)' }}>₹{item.payout}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                  {item.status}
                </div>
              </div>
              
              <ChevronRight size={16} color="var(--color-text-muted)" />
            </div>
          ))}
        </div>
      )}
      
      {/* Basic Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
        <button 
          className="btn btn-secondary btn-sm" 
          disabled={page === 1}
          onClick={() => setPage(p => p - 1)}
        >
          Previous
        </button>
        <span style={{ fontSize: '0.875rem', alignSelf: 'center' }}>Page {page}</span>
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};
