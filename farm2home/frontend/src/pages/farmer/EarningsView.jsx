import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { paymentService } from '../../services/paymentService';
import {
  IndianRupee,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Smartphone,
  ArrowUpRight,
  Filter,
  RefreshCw,
  X,
  ShieldCheck,
  CreditCard
} from 'lucide-react';

export const EarningsView = () => {
  const { t } = useLanguage();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Request Payout Modal
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutStatusMessage, setPayoutStatusMessage] = useState({ error: '', success: '' });

  // Edit Payout Account Modal
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountForm, setAccountForm] = useState({
    payout_method: 'UPI',
    upi_id: '',
    account_holder: '',
    account_number: '',
    bank_name: '',
    bank_ifsc: ''
  });
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountStatusMessage, setAccountStatusMessage] = useState({ error: '', success: '' });

  const loadEarnings = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await paymentService.getFarmerEarnings();
      setData(res);
      if (res?.payout_account) {
        setAccountForm({
          payout_method: res.payout_account.payout_method || 'UPI',
          upi_id: res.payout_account.payout_upi_id || '',
          account_holder: res.payout_account.payout_account_holder || '',
          account_number: '', // Never pre-fill raw account number
          bank_name: res.payout_account.payout_bank_name || '',
          bank_ifsc: res.payout_account.payout_bank_ifsc || ''
        });
      }
    } catch (err) {
      console.error('Failed to load farmer earnings:', err);
      setError('Unable to load earnings data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEarnings();
  }, []);

  const summary = data?.summary || {
    total_earnings: 0,
    earnings_this_month: 0,
    pending_balance: 0,
    paid_out_amount: 0,
    min_payout_amount: 500
  };

  const transactions = data?.transactions || [];
  const payouts = data?.payouts || [];
  const payoutAccount = data?.payout_account || {};

  const filteredTransactions = transactions.filter((tx) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') return tx.settlement_status === 'pending' || tx.settlement_status === 'processing';
    if (filterStatus === 'paid') return tx.settlement_status === 'paid';
    return true;
  });

  const handleOpenPayoutModal = () => {
    setPayoutStatusMessage({ error: '', success: '' });
    setPayoutAmount(summary.pending_balance.toString());
    setPayoutNotes('');
    setShowPayoutModal(true);
  };

  const handleRequestPayout = async (e) => {
    e.preventDefault();
    setPayoutStatusMessage({ error: '', success: '' });

    const amt = parseFloat(payoutAmount);
    if (isNaN(amt) || amt < (summary.min_payout_amount || 500)) {
      setPayoutStatusMessage({ error: `Minimum payout request is ₹${summary.min_payout_amount || 500}`, success: '' });
      return;
    }

    if (amt > summary.pending_balance) {
      setPayoutStatusMessage({ error: `Requested amount exceeds available balance of ₹${summary.pending_balance}`, success: '' });
      return;
    }

    try {
      setRequestingPayout(true);
      const res = await paymentService.requestPayout(amt, payoutNotes);
      setPayoutStatusMessage({ error: '', success: res.message || 'Payout requested successfully!' });
      setTimeout(() => {
        setShowPayoutModal(false);
        loadEarnings();
      }, 1200);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to submit payout request';
      setPayoutStatusMessage({ error: msg, success: '' });
    } finally {
      setRequestingPayout(false);
    }
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setAccountStatusMessage({ error: '', success: '' });

    try {
      setSavingAccount(true);
      const res = await paymentService.updatePayoutAccount(accountForm);
      setAccountStatusMessage({ error: '', success: 'Payout destination updated securely!' });
      setTimeout(() => {
        setShowAccountModal(false);
        loadEarnings();
      }, 1000);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update payout details';
      setAccountStatusMessage({ error: msg, success: '' });
    } finally {
      setSavingAccount(false);
    }
  };

  const canRequestPayout = summary.pending_balance >= (summary.min_payout_amount || 500);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
            {t('earningsTitle')}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {t('earningsSubtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={loadEarnings}
            disabled={loading}
            title="Refresh earnings"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={handleOpenPayoutModal}
            disabled={!canRequestPayout}
            title={canRequestPayout ? 'Request bank/UPI settlement' : `Minimum pending balance of ₹${summary.min_payout_amount || 500} required`}
          >
            <ArrowUpRight size={16} />
            <span>{t('requestPayout')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-sm)',
          color: '#b91c1c',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      {/* Top 4 Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="stat-card-clean">
          <div className="stat-card-title">
            <IndianRupee size={16} color="var(--color-success)" />
            <span>{t('lifetimeEarnings')}</span>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--color-primary)' }}>
            ₹{loading ? '...' : summary.total_earnings.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            100% direct produce value
          </div>
        </div>

        <div className="stat-card-clean">
          <div className="stat-card-title">
            <TrendingUp size={16} color="var(--color-accent-customer)" />
            <span>{t('earningsThisMonth')}</span>
          </div>
          <div className="stat-card-value">
            ₹{loading ? '...' : summary.earnings_this_month.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Current calendar harvest month
          </div>
        </div>

        <div className="stat-card-clean" style={{ borderColor: canRequestPayout ? 'var(--color-primary-border)' : 'var(--border-hairline)' }}>
          <div className="stat-card-title">
            <Clock size={16} color="var(--color-warning)" />
            <span>{t('pendingBalance')}</span>
          </div>
          <div className="stat-card-value" style={{ color: summary.pending_balance > 0 ? 'var(--color-warning)' : 'inherit' }}>
            ₹{loading ? '...' : summary.pending_balance.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {canRequestPayout ? 'Ready for payout settlement' : `Min payout: ₹${summary.min_payout_amount || 500}`}
          </div>
        </div>

        <div className="stat-card-clean">
          <div className="stat-card-title">
            <CheckCircle2 size={16} color="#16a34a" />
            <span>{t('paidOutAmount')}</span>
          </div>
          <div className="stat-card-value">
            ₹{loading ? '...' : summary.paid_out_amount.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Settled directly to farmer bank/UPI
          </div>
        </div>
      </div>

      {/* Payout Destination Banner */}
      <div style={{
        padding: '16px 20px',
        backgroundColor: 'var(--color-bg-surface)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {payoutAccount.payout_method === 'UPI' ? (
              <Smartphone size={20} color="var(--color-primary)" />
            ) : (
              <Building2 size={20} color="var(--color-primary)" />
            )}
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              {t('payoutDestination')} ({payoutAccount.payout_method || 'UPI'})
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{payoutAccount.masked_display || 'Not configured yet'}</span>
              <ShieldCheck size={14} color="var(--color-success)" />
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            setAccountStatusMessage({ error: '', success: '' });
            setShowAccountModal(true);
          }}
        >
          {t('editDestination')}
        </button>
      </div>

      {/* Transactions & Settlement Ledger */}
      <div className="product-table-wrapper">
        <div className="table-header-row" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{t('transactionsTitle')}</h3>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              Breakdown of earnings per customer order
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={14} color="var(--color-text-muted)" />
            <select
              className="form-input"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8125rem' }}
            >
              <option value="all">{t('filterAll')}</option>
              <option value="pending">{t('filterPending')}</option>
              <option value="paid">{t('filterPaid')}</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading earnings ledger...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <IndianRupee size={22} color="var(--color-text-muted)" />
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '4px' }}>
              {t('noTransactionsYet')}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              Completed order payments are automatically credited directly to your pending settlement ledger.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-clean">
              <thead>
                <tr>
                  <th>{t('orderNumber')} & {t('date')}</th>
                  <th>{t('customer')}</th>
                  <th>{t('items')}</th>
                  <th>{t('gross')}</th>
                  <th>{t('platformFee')}</th>
                  <th>{t('net')}</th>
                  <th style={{ textAlign: 'right' }}>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{tx.order_number}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{tx.created_at}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{tx.customer_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{tx.payment_method}</div>
                    </td>
                    <td style={{ maxWidth: '240px' }}>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tx.items_summary}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                      ₹{tx.gross_amount.toFixed(2)}
                    </td>
                    <td style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                      ₹{tx.platform_fee.toFixed(2)}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: '0.9375rem' }}>
                      ₹{tx.net_amount.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`badge ${
                        tx.settlement_status === 'paid' ? 'badge-success' :
                        tx.settlement_status === 'processing' ? 'badge-neutral' :
                        'badge-warning'
                      }`}>
                        {tx.settlement_status === 'paid' ? 'Settled / Paid' :
                         tx.settlement_status === 'processing' ? 'Processing' :
                         'Pending Settlement'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout Settlements History */}
      {payouts.length > 0 && (
        <div className="product-table-wrapper" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '14px' }}>
            {t('payoutHistory')}
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="table-clean">
              <thead>
                <tr>
                  <th>Payout Ref</th>
                  <th>Amount</th>
                  <th>Destination</th>
                  <th>Requested Date</th>
                  <th>Settled Date</th>
                  <th style={{ textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.payout_reference}</td>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>₹{p.amount.toLocaleString()}</td>
                    <td style={{ fontSize: '0.8125rem' }}>{p.payout_method} · {p.account_reference_masked}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{p.requested_at}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{p.settled_at || 'Pending'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`badge ${p.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REQUEST PAYOUT MODAL */}
      {showPayoutModal && (
        <div className="modal-overlay" onClick={() => setShowPayoutModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowUpRight size={20} color="var(--color-primary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{t('requestPayout')}</h3>
              </div>
              <button
                onClick={() => setShowPayoutModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {payoutStatusMessage.error && (
              <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', color: '#b91c1c', fontSize: '0.875rem', marginBottom: '14px' }}>
                {payoutStatusMessage.error}
              </div>
            )}

            {payoutStatusMessage.success && (
              <div style={{ padding: '8px 12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-sm)', color: '#15803d', fontSize: '0.875rem', marginBottom: '14px' }}>
                {payoutStatusMessage.success}
              </div>
            )}

            <div style={{ padding: '12px', backgroundColor: 'var(--color-bg-app)', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Available Balance:</span>
                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>₹{summary.pending_balance.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Settlement Destination:</span>
                <span style={{ fontWeight: 500 }}>{payoutAccount.masked_display || 'Default UPI'}</span>
              </div>
            </div>

            <form onSubmit={handleRequestPayout}>
              <div className="form-group">
                <label className="form-label">Payout Amount (₹)</label>
                <input
                  type="number"
                  step="1"
                  min={summary.min_payout_amount || 500}
                  max={summary.pending_balance}
                  className="form-input"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  required
                  style={{ fontSize: '1.25rem', fontWeight: 600 }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  {t('minPayoutNotice')}
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Notes / Harvest Reference (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  placeholder="e.g. September Harvest settlement"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPayoutModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={requestingPayout}
                >
                  {requestingPayout ? 'Submitting...' : 'Confirm Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PAYOUT ACCOUNT MODAL */}
      {showAccountModal && (
        <div className="modal-overlay" onClick={() => setShowAccountModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="var(--color-primary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Payout Settings</h3>
              </div>
              <button
                onClick={() => setShowAccountModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {accountStatusMessage.error && (
              <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', color: '#b91c1c', fontSize: '0.875rem', marginBottom: '14px' }}>
                {accountStatusMessage.error}
              </div>
            )}

            {accountStatusMessage.success && (
              <div style={{ padding: '8px 12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-sm)', color: '#15803d', fontSize: '0.875rem', marginBottom: '14px' }}>
                {accountStatusMessage.success}
              </div>
            )}

            <form onSubmit={handleSaveAccount}>
              <div className="form-group">
                <label className="form-label">Nominated Settlement Method</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${accountForm.payout_method === 'UPI' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setAccountForm({ ...accountForm, payout_method: 'UPI' })}
                    style={{ justifyContent: 'center' }}
                  >
                    <Smartphone size={14} />
                    <span>UPI ID (Instant)</span>
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${accountForm.payout_method === 'Bank Account' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setAccountForm({ ...accountForm, payout_method: 'Bank Account' })}
                    style={{ justifyContent: 'center' }}
                  >
                    <Building2 size={14} />
                    <span>Bank Transfer</span>
                  </button>
                </div>
              </div>

              {accountForm.payout_method === 'UPI' ? (
                <div className="form-group">
                  <label className="form-label">UPI ID / VPA</label>
                  <input
                    type="text"
                    className="form-input"
                    value={accountForm.upi_id}
                    onChange={(e) => setAccountForm({ ...accountForm, upi_id: e.target.value })}
                    placeholder="e.g. 9876543210@upi or farmer@okhdfcbank"
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    Works with GPay, PhonePe, Paytm, BHIM, or any bank UPI
                  </span>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Account Holder Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={accountForm.account_holder}
                      onChange={(e) => setAccountForm({ ...accountForm, account_holder: e.target.value })}
                      placeholder="e.g. Ramesh Kumar"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bank Account Number (Masked on Save)</label>
                    <input
                      type="password"
                      className="form-input"
                      value={accountForm.account_number}
                      onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                      placeholder={payoutAccount.payout_account_last_four ? `Current: ••••${payoutAccount.payout_account_last_four}` : 'Enter account number'}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      Security guaranteed: only the last 4 digits are stored for reference.
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Bank Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={accountForm.bank_name}
                        onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })}
                        placeholder="e.g. HDFC Bank / SBI"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">IFSC Code</label>
                      <input
                        type="text"
                        className="form-input"
                        value={accountForm.bank_ifsc}
                        onChange={(e) => setAccountForm({ ...accountForm, bank_ifsc: e.target.value })}
                        placeholder="e.g. HDFC0001234"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAccountModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingAccount}
                >
                  {savingAccount ? 'Saving...' : 'Save Payout Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
