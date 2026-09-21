import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from '../components/common/LanguageToggle';
import '../styles/auth.css';

// Compute password strength 1–4
function getStrength(pwd) {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.max(1, Math.min(4, score));
}

export const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const { t } = useLanguage();

  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [newPwdErr, setNewPwdErr] = useState('');
  const [confirmPwdErr, setConfirmPwdErr] = useState('');

  const strength = getStrength(newPwd);
  const strengthLabels = [
    t('passwordStrengthWeak'),
    t('passwordStrengthFair'),
    t('passwordStrengthGood'),
    t('passwordStrengthStrong'),
  ];
  const strengthClasses = ['s1', 's2', 's3', 's4'];

  const validate = () => {
    let valid = true;
    if (!newPwd || newPwd.length < 8) {
      setNewPwdErr(t('passwordTooShort'));
      valid = false;
    } else {
      setNewPwdErr('');
    }
    if (!confirmPwd) {
      setConfirmPwdErr('Confirm password is required');
      valid = false;
    } else if (newPwd !== confirmPwd) {
      setConfirmPwdErr(t('passwordsDoNotMatch'));
      valid = false;
    } else {
      setConfirmPwdErr('');
    }
    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setError('');
    setLoading(true);
    try {
      await resetPassword(token, newPwd);
      setSuccess(true);
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail?.toLowerCase().includes('invalid') || detail?.toLowerCase().includes('expired')) {
        setError(t('invalidResetToken'));
      } else {
        setError(detail || t('authErrorGeneric'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-app)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 32px', background: 'var(--color-bg-surface)',
        borderBottom: 'var(--border-hairline)'
      }}>
        <Link to="/" className="auth-back-link">
          <ArrowLeft size={16} />
          <span>Back</span>
        </Link>
        <LanguageToggle />
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{
          width: '100%', maxWidth: '440px',
          background: 'var(--color-bg-surface)',
          border: 'var(--border-hairline)',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
        }}>
          {success ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'var(--color-success-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px'
              }}>
                <CheckCircle2 size={32} color="var(--color-success)" />
              </div>
              <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: 12, color: 'var(--color-text-main)' }}>
                Password reset!
              </h1>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                {t('passwordResetSuccess')}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>Redirecting you in 3 seconds…</p>
            </div>
          ) : (
            <>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'var(--color-primary-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20
              }}>
                <Lock size={24} color="var(--color-primary)" />
              </div>

              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8, color: 'var(--color-text-main)', letterSpacing: '-0.3px' }}>
                {t('resetPassword')}
              </h1>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: 28, lineHeight: 1.6 }}>
                Choose a new, strong password for your account.
              </p>

              {error && (
                <div className="auth-error-banner" role="alert" aria-live="assertive">
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {/* New password */}
                <div className="auth-form-group">
                  <label htmlFor="new-pwd" className="auth-label">{t('newPassword')}</label>
                  <div className="auth-input-wrap">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      id="new-pwd"
                      type={showNew ? 'text' : 'password'}
                      className={`auth-input has-toggle focus-farmer${newPwdErr ? ' error' : ''}`}
                      value={newPwd}
                      onChange={(e) => { setNewPwd(e.target.value); if (newPwdErr) setNewPwdErr(''); }}
                      autoComplete="new-password"
                      aria-describedby={newPwdErr ? 'new-pwd-err' : 'pwd-strength'}
                    />
                    <button type="button" className="auth-input-toggle" onClick={() => setShowNew(p => !p)} aria-label="Toggle password visibility">
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {/* Strength meter */}
                  {newPwd && (
                    <div id="pwd-strength">
                      <div className="pwd-strength-bars">
                        {[1, 2, 3, 4].map(n => (
                          <div
                            key={n}
                            className={`pwd-strength-bar${strength >= n ? ` active ${strengthClasses[strength - 1]}` : ''}`}
                          />
                        ))}
                      </div>
                      <span className={`pwd-strength-label ${strengthClasses[strength - 1]}`}>
                        {strengthLabels[strength - 1]}
                      </span>
                    </div>
                  )}
                  {newPwdErr && (
                    <span id="new-pwd-err" className="auth-field-error" role="alert">
                      <AlertCircle size={12} /> {newPwdErr}
                    </span>
                  )}
                </div>

                {/* Confirm password */}
                <div className="auth-form-group">
                  <label htmlFor="confirm-pwd" className="auth-label">{t('confirmPassword')}</label>
                  <div className="auth-input-wrap">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      id="confirm-pwd"
                      type={showConfirm ? 'text' : 'password'}
                      className={`auth-input has-toggle focus-farmer${confirmPwdErr ? ' error' : ''}`}
                      value={confirmPwd}
                      onChange={(e) => { setConfirmPwd(e.target.value); if (confirmPwdErr) setConfirmPwdErr(''); }}
                      autoComplete="new-password"
                      aria-describedby={confirmPwdErr ? 'confirm-pwd-err' : undefined}
                    />
                    <button type="button" className="auth-input-toggle" onClick={() => setShowConfirm(p => !p)} aria-label="Toggle password visibility">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirmPwdErr && (
                    <span id="confirm-pwd-err" className="auth-field-error" role="alert">
                      <AlertCircle size={12} /> {confirmPwdErr}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loading}
                  style={{ background: 'var(--color-primary)', color: '#fff' }}
                >
                  {loading ? (
                    <><div className="auth-spinner" /> {t('resetting')}</>
                  ) : t('resetPassword')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
