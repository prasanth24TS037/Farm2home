import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { deliveryService } from '../../services/deliveryService';
import { 
  IndianRupee, 
  CreditCard, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  Wallet, 
  Building, 
  Edit3, 
  X, 
  Check, 
  AlertCircle,
  FileText,
  Filter
} from 'lucide-react';

export const DeliveryEarnings = () => {
  const { t } = useLanguage();
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('transactions'); // 'transactions' or 'payouts'
  const [filterStatus, setFilterStatus] = useState('all');

  // Request Payout Modal state
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState('');

  // Edit Account Modal state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountForm, setAccountForm] = useState({
    payout_method: 'UPI',
    upi_id: '',
    account_holder: '',
    account_number: '',
    bank_name: '',
    bank_ifsc: ''
  });
  const [accountSubmitting, setAccountSubmitting] = useState(false);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const data = await deliveryService.getEarnings();
      setEarnings(data);
      if (data.payout_account) {
        setAccountForm({
          payout_method: data.payout_account.payout_method || 'UPI',
          upi_id: data.payout_account.payout_upi_id || '',
          account_holder: data.payout_account.payout_account_holder || '',
          account_number: '',
          bank_name: data.payout_account.payout_bank_name || '',
          bank_ifsc: data.payout_account.payout_bank_ifsc || ''
        });
      }
    } catch (err) {
      console.error("Earnings fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  const handleRequestPayout = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(payoutAmount);
    if (isNaN(amountNum) || amountNum < (earnings?.min_payout_amount || 200)) {
      alert(`Minimum payout withdrawal amount is ₹${earnings?.min_payout_amount || 200}`);
      return;
    }
    if (amountNum > (earnings?.pending_settlement || 0)) {
      alert(`Amount exceeds your available pending balance of ₹${earnings?.pending_settlement}`);
      return;
    }

    setPayoutSubmitting(true);
    try {
      await deliveryService.requestPayout(amountNum, payoutNotes);
      setPayoutSuccessMsg(`Withdrawal request for ₹${amountNum.toLocaleString()} submitted successfully!`);
      setShowPayoutModal(false);
      setPayoutAmount('');
      setPayoutNotes('');
      fetchEarnings();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to submit payout request.");
    } finally {
      setPayoutSubmitting(false);
    }
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setAccountSubmitting(true);
    try {
      await deliveryService.updatePayoutAccount(accountForm);
      setShowAccountModal(false);
      fetchEarnings();
    } catch (err) {
      alert("Failed to update payout destination.");
    } finally {
      setAccountSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <Wallet size={32} color="var(--color-accent-delivery)" style={{ animation: 'bounce 1s infinite', margin: '0 auto 12px' }} />
        <div>Loading earnings ledger...</div>
      </div>
    );
  }

  const minPayout = earnings?.min_payout_amount || 200.0;
  const canRequest = (earnings?.pending_settlement || 0) >= minPayout;
  const transactions = earnings?.transactions || [];
  const payouts = earnings?.payouts || [];

  const filteredTransactions = transactions.filter(t => {
    if (filterStatus === 'settled') return t.status === 'settled';
    if (filterStatus === 'pending') return t.status !== 'settled';
    return true;
  });

  return (
    <div style={{ padding: '0 20px' }}>
      {/* HEADER */}
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
            {t('earnings', 'Earnings & Payouts')}
          </h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Direct delivery settlements ledger
          </div>
        </div>
      </div>

      {payoutSuccessMsg && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 'var(--radius-md)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: '#166534', fontWeight: 600 }}>
            <Check size={16} /> {payoutSuccessMsg}
          </div>
          <button onClick={() => setPayoutSuccessMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* 4 STATS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
        <div className="stat-card-clean" style={{ padding: '14px' }}>
          <div className="stat-card-title" style={{ fontSize: '0.8rem' }}>
            <IndianRupee size={15} color="var(--color-success)" />
            <span>{t('totalEarnings', 'Total Earnings')}</span>
          </div>
          <div className="stat-card-value" style={{ fontSize: '1.6rem', color: 'var(--color-success)', marginTop: '4px' }}>
            ₹{earnings?.total_earnings?.toLocaleString()}
          </div>
        </div>

        <div className="stat-card-clean" style={{ padding: '14px' }}>
          <div className="stat-card-title" style={{ fontSize: '0.8rem' }}>
            <Clock size={15} color="var(--color-accent-delivery)" />
            <span>This Month</span>
          </div>
          <div className="stat-card-value" style={{ fontSize: '1.6rem', color: 'var(--color-accent-delivery)', marginTop: '4px' }}>
            ₹{earnings?.this_month?.toLocaleString()}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
        <div className="stat-card-clean" style={{ padding: '14px', backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
          <div className="stat-card-title" style={{ fontSize: '0.8rem', color: '#92400e' }}>
            <Wallet size={15} color="#d97706" />
            <span>{t('pendingSettlement', 'Pending Balance')}</span>
          </div>
          <div className="stat-card-value" style={{ fontSize: '1.6rem', color: '#b45309', marginTop: '4px' }}>
            ₹{earnings?.pending_settlement?.toLocaleString()}
          </div>
        </div>

        <div className="stat-card-clean" style={{ padding: '14px' }}>
          <div className="stat-card-title" style={{ fontSize: '0.8rem' }}>
            <CreditCard size={15} color="var(--color-primary)" />
            <span>{t('paidOut', 'Paid Out')}</span>
          </div>
          <div className="stat-card-value" style={{ fontSize: '1.6rem', color: 'var(--color-text-main)', marginTop: '4px' }}>
            ₹{earnings?.paid_out?.toLocaleString()}
          </div>
        </div>
      </div>

      {/* WITHDRAWAL / PAYOUT ACTION BANNER */}
      <div style={{
        backgroundColor: 'var(--color-bg-surface)',
        padding: '16px',
        borderRadius: 'var(--radius-lg)',
        border: 'var(--border-hairline)',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div className="flex-between" style={{ marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
              Available for Payout
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-accent-delivery)', marginTop: '2px' }}>
              ₹{earnings?.pending_settlement?.toLocaleString()}
            </div>
          </div>
          <button 
            className="btn btn-accent-delivery" 
            style={{ padding: '10px 18px', fontWeight: 700 }}
            disabled={!canRequest}
            onClick={() => {
              setPayoutAmount(String(earnings?.pending_settlement || ''));
              setShowPayoutModal(true);
            }}
          >
            {t('requestPayout', 'Request Payout')}
          </button>
        </div>

        {/* Payout Destination Card with Masked Display */}
        <div style={{
          backgroundColor: 'var(--color-bg-app)',
          padding: '10px 12px',
          borderRadius: 'var(--radius-sm)',
          border: 'var(--border-hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building size={14} color="var(--color-text-muted)" />
            <span>Payout to: <b>{earnings?.payout_account?.masked_display || 'Not Configured'}</b></span>
          </div>
          <button
            onClick={() => setShowAccountModal(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-accent-delivery)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              padding: 0
            }}
          >
            <Edit3 size={12} /> {t('editAccount', 'Edit')}
          </button>
        </div>

        {!canRequest && (
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>
            ℹ️ {t('minPayoutNoticeDelivery', `Minimum payout withdrawal amount is ₹${minPayout}`)}
          </div>
        )}
      </div>

      {/* TRANSACTIONS & PAYOUTS TABS */}
      <div style={{ display: 'flex', borderBottom: 'var(--border-hairline)', marginBottom: '14px' }}>
        <button
          style={{
            flex: 1,
            padding: '10px',
            fontSize: '0.875rem',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: activeSubTab === 'transactions' ? 'var(--color-accent-delivery)' : 'var(--color-text-muted)',
            borderBottom: activeSubTab === 'transactions' ? '2px solid var(--color-accent-delivery)' : '2px solid transparent'
          }}
          onClick={() => setActiveSubTab('transactions')}
        >
          Delivery Ledger ({transactions.length})
        </button>
        <button
          style={{
            flex: 1,
            padding: '10px',
            fontSize: '0.875rem',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: activeSubTab === 'payouts' ? 'var(--color-accent-delivery)' : 'var(--color-text-muted)',
            borderBottom: activeSubTab === 'payouts' ? '2px solid var(--color-accent-delivery)' : '2px solid transparent'
          }}
          onClick={() => setActiveSubTab('payouts')}
        >
          Payout History ({payouts.length})
        </button>
      </div>

      {/* SUB-TAB 1: TRANSACTIONS LIST */}
      {activeSubTab === 'transactions' && (
        <div>
          {filteredTransactions.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '36px 20px',
              backgroundColor: 'var(--color-bg-surface)',
              borderRadius: 'var(--radius-md)',
              border: 'var(--border-hairline)',
              color: 'var(--color-text-muted)'
            }}>
              <FileText size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              <div style={{ fontSize: '0.875rem' }}>No delivery earning records yet.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredTransactions.map((trx, idx) => (
                <div 
                  key={trx.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    backgroundColor: 'var(--color-bg-surface)',
                    border: 'var(--border-hairline)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-success)'
                    }}>
                      <ArrowUpRight size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                        {trx.order_number}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        {trx.pickup_name} → {trx.drop_name} ({trx.distance} km)
                      </div>
                      <div style={{ fontSize: '0.675rem', color: 'var(--color-text-light)', marginTop: '1px' }}>
                        {trx.date}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-success)' }}>
                      +₹{trx.payout}
                    </div>
                    <span 
                      className="badge badge-success" 
                      style={{ fontSize: '0.65rem', padding: '1px 6px', fontWeight: 600, marginTop: '2px' }}
                    >
                      ✓ Settled
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: PAYOUT REQUESTS HISTORY */}
      {activeSubTab === 'payouts' && (
        <div>
          {payouts.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '36px 20px',
              backgroundColor: 'var(--color-bg-surface)',
              borderRadius: 'var(--radius-md)',
              border: 'var(--border-hairline)',
              color: 'var(--color-text-muted)'
            }}>
              <CreditCard size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              <div style={{ fontSize: '0.875rem' }}>No withdrawal requests submitted yet.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {payouts.map((po) => (
                <div 
                  key={po.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    backgroundColor: 'var(--color-bg-surface)',
                    border: 'var(--border-hairline)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                      {po.payout_reference}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      To: {po.account_reference_masked} ({po.payout_method})
                    </div>
                    <div style={{ fontSize: '0.675rem', color: 'var(--color-text-light)', marginTop: '1px' }}>
                      Requested: {po.requested_at}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                      ₹{po.amount}
                    </div>
                    <span 
                      className={`badge ${po.status === 'paid' ? 'badge-success' : 'badge-warning'}`} 
                      style={{ fontSize: '0.65rem', padding: '1px 6px', fontWeight: 600, marginTop: '2px', textTransform: 'capitalize' }}
                    >
                      {po.status === 'paid' ? '✓ Paid' : '⏳ Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* REQUEST PAYOUT MODAL */}
      {showPayoutModal && (
        <div className="modal-overlay" onClick={() => setShowPayoutModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="flex-between" style={{ marginBottom: '14px', borderBottom: 'var(--border-hairline)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={18} color="var(--color-accent-delivery)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                  {t('requestPayout', 'Request Payout')}
                </h3>
              </div>
              <button onClick={() => setShowPayoutModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRequestPayout}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Withdrawal Amount (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  min={minPayout}
                  max={earnings?.pending_settlement || 0}
                  step="1"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder={`Min ₹${minPayout}`}
                  required
                />
                <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Available balance: ₹{earnings?.pending_settlement}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label">Note (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Weekly earnings payout"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                />
              </div>

              <div style={{
                backgroundColor: 'var(--color-bg-app)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '16px',
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)'
              }}>
                Funds will be deposited to: <b>{earnings?.payout_account?.masked_display}</b> within 24 hours.
              </div>

              <button
                type="submit"
                className="btn btn-accent-delivery"
                style={{ width: '100%', padding: '12px', fontWeight: 700 }}
                disabled={payoutSubmitting}
              >
                {payoutSubmitting ? 'Submitting...' : 'Confirm Payout Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PAYOUT ACCOUNT MODAL */}
      {showAccountModal && (
        <div className="modal-overlay" onClick={() => setShowAccountModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="flex-between" style={{ marginBottom: '14px', borderBottom: 'var(--border-hairline)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={18} color="var(--color-accent-delivery)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                  {t('editAccount', 'Edit Payout Destination')}
                </h3>
              </div>
              <button onClick={() => setShowAccountModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAccount}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <button
                  type="button"
                  className="btn"
                  style={{
                    flex: 1,
                    padding: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    backgroundColor: accountForm.payout_method === 'UPI' ? 'var(--color-accent-delivery)' : 'var(--color-bg-subtle)',
                    color: accountForm.payout_method === 'UPI' ? '#ffffff' : 'var(--color-text-main)',
                    border: 'var(--border-hairline)'
                  }}
                  onClick={() => setAccountForm({ ...accountForm, payout_method: 'UPI' })}
                >
                  UPI ID (VPA)
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{
                    flex: 1,
                    padding: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    backgroundColor: accountForm.payout_method === 'Bank Account' ? 'var(--color-accent-delivery)' : 'var(--color-bg-subtle)',
                    color: accountForm.payout_method === 'Bank Account' ? '#ffffff' : 'var(--color-text-main)',
                    border: 'var(--border-hairline)'
                  }}
                  onClick={() => setAccountForm({ ...accountForm, payout_method: 'Bank Account' })}
                >
                  Bank Account
                </button>
              </div>

              {accountForm.payout_method === 'UPI' ? (
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>UPI ID / VPA</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. name@okaxis or 9876543210@upi"
                    value={accountForm.upi_id}
                    onChange={(e) => setAccountForm({ ...accountForm, upi_id: e.target.value })}
                    required
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Account Holder Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={accountForm.account_holder}
                      onChange={(e) => setAccountForm({ ...accountForm, account_holder: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Account Number (Only last 4 digits saved)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 5010023456789"
                      value={accountForm.account_number}
                      onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Bank Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. HDFC Bank"
                      value={accountForm.bank_name}
                      onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>IFSC Code</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. HDFC0001234"
                      value={accountForm.bank_ifsc}
                      onChange={(e) => setAccountForm({ ...accountForm, bank_ifsc: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-accent-delivery"
                style={{ width: '100%', padding: '12px', fontWeight: 700 }}
                disabled={accountSubmitting}
              >
                {accountSubmitting ? 'Saving...' : 'Save Payout Details'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
