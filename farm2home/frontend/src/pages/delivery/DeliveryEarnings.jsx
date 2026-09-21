import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { deliveryService } from '../../services/deliveryService';
import { IndianRupee, CreditCard, ArrowUpRight, Clock, CheckCircle2 } from 'lucide-react';

export const DeliveryEarnings = () => {
  const { t } = useLanguage();
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    deliveryService.getEarnings()
      .then(data => setEarnings(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading earnings...</div>;
  if (!earnings) return <div style={{ padding: '20px', textAlign: 'center' }}>Failed to load earnings.</div>;

  return (
    <div style={{ padding: '0 20px' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>{t('earnings', 'Earnings & Payouts')}</h2>

      <div className="stats-grid-2" style={{ marginBottom: '16px' }}>
        <div className="stat-card-clean" style={{ padding: '14px' }}>
          <div className="stat-card-title" style={{ fontSize: '0.8125rem' }}>
            <IndianRupee size={14} color="var(--color-success)" />
            <span>Total Earnings</span>
          </div>
          <div className="stat-card-value" style={{ fontSize: '1.5rem', color: 'var(--color-success)' }}>
            ₹{earnings.total_earnings.toLocaleString()}
          </div>
        </div>

        <div className="stat-card-clean" style={{ padding: '14px' }}>
          <div className="stat-card-title" style={{ fontSize: '0.8125rem' }}>
            <CreditCard size={14} color="var(--color-primary)" />
            <span>Paid Out</span>
          </div>
          <div className="stat-card-value" style={{ fontSize: '1.5rem' }}>
            ₹{earnings.paid_out.toLocaleString()}
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--color-bg-surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: 'var(--border-hairline)', marginBottom: '24px' }}>
        <div className="flex-between" style={{ marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Pending Settlement</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>₹{earnings.pending_settlement.toLocaleString()}</div>
          </div>
          <button className="btn btn-accent-delivery">Request Payout</button>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          To UPI ID: <b>xxxxxx4421@okbiz</b>
        </div>
      </div>

      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Recent Transactions</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {earnings.transactions.map((trx, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--color-bg-surface)', border: 'var(--border-hairline)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowUpRight size={16} color="var(--color-success)" />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{trx.order_number}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{new Date(trx.date).toLocaleDateString()}</div>
              </div>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>+₹{trx.payout}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', fontSize: '0.75rem', color: trx.status === 'settled' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {trx.status === 'settled' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                <span style={{ textTransform: 'capitalize' }}>{trx.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
