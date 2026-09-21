import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from '../components/common/LanguageToggle';
import '../styles/auth.css';

export const ForgotPasswordPage = () => {
  const { forgotPassword } = useAuth();
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');

  const validateEmail = (val) => {
    if (!val) return 'Email address is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Enter a valid email address';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateEmail(email);
    if (err) { setEmailError(err); return; }
    setEmailError('');
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      // Always show success — never reveal whether email exists
      setSubmitted(true);
    } catch (err) {
      // Even on server error, show neutral message to prevent enumeration
      if (err?.response?.status === 429) {
        setError('Too many requests. Please wait a few minutes before trying again.');
      } else {
        // Show success anyway — don't leak info
        setSubmitted(true);
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
          <span>Back to home</span>
        </Link>
        <LanguageToggle />
      </div>

      {/* Card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{
          width: '100%', maxWidth: '440px',
          background: 'var(--color-bg-surface)',
          border: 'var(--border-hairline)',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
        }}>
          {!submitted ? (
            <>
              {/* Icon */}
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'var(--color-primary-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20
              }}>
                <Mail size={24} color="var(--color-primary)" />
              </div>

              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8, color: 'var(--color-text-main)', letterSpacing: '-0.3px' }}>
                {t('forgotPassword')}
              </h1>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: 28, lineHeight: 1.6 }}>
                {t('enterEmailForReset')}
              </p>

              {error && (
                <div className="auth-error-banner" role="alert" aria-live="assertive">
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="auth-form-group">
                  <label htmlFor="reset-email" className="auth-label">{t('emailAddress')}</label>
                  <div className="auth-input-wrap">
                    <Mail size={16} className="auth-input-icon" />
                    <input
                      id="reset-email"
                      type="email"
                      className={`auth-input focus-farmer${emailError ? ' error' : ''}`}
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(''); }}
                      onBlur={() => setEmailError(validateEmail(email))}
                      placeholder="you@example.com"
                      autoComplete="email"
                      autoFocus
                      aria-describedby={emailError ? 'reset-email-err' : undefined}
                    />
                  </div>
                  {emailError && (
                    <span id="reset-email-err" className="auth-field-error" role="alert">
                      <AlertCircle size={12} /> {emailError}
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
                    <><div className="auth-spinner" /> {t('sending')}</>
                  ) : t('sendResetLink')}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <Link to="/login/farmer" className="auth-back-link" style={{ fontSize: '0.875rem' }}>
                  <ArrowLeft size={14} /> {t('backToLogin')}
                </Link>
              </div>
            </>
          ) : (
            /* Confirmation state */
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
                {t('resetLinkSent')}
              </h1>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.65, marginBottom: 28 }}>
                {t('resetLinkSentDesc')}
              </p>
              <Link
                to="/"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: '0.9rem', color: 'var(--color-primary)', fontWeight: 500
                }}
              >
                <ArrowLeft size={15} /> {t('backToLogin')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
