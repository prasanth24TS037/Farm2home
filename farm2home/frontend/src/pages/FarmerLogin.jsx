import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AuthLayout } from '../components/auth/AuthLayout';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { Sprout, Phone, Mail, Lock, Eye, EyeOff, AlertCircle, User, MapPin } from 'lucide-react';

// Placeholder (GoogleLogo used only inside GoogleSignInButton now)
const _placeholder = () => (
  null
);

const OTP_LENGTH = 4;

export const FarmerLogin = () => {
  const navigate = useNavigate();
  const { login, otpLogin, register, googleLogin, loading } = useAuth();
  const { t } = useLanguage();

  const [authMode, setAuthMode] = useState('otp'); // 'otp' | 'password' | 'register'
  const [phone, setPhone] = useState(import.meta.env.DEV ? '+91 98765 43210' : '');
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [email, setEmail] = useState(import.meta.env.DEV ? 'farmer@farm2home.com' : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? 'Farmer@123' : '');
  const [showPwd, setShowPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Register fields
  const [fullName, setFullName] = useState('');
  const [farmName, setFarmName] = useState('');
  const [location, setLocation] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPwd, setShowRegPwd] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const otpRefs = useRef([]);

  // OTP countdown timer
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setTimeout(() => setOtpCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  // ── OTP box handlers ──────────────────────────────
  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    const next = [...otp];
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setOtp(next);
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    otpRefs.current[focusIdx]?.focus();
  };

  const handleResendOtp = () => {
    setOtpCountdown(60);
    setOtp(Array(OTP_LENGTH).fill(''));
    otpRefs.current[0]?.focus();
  };

  // ── Validation ────────────────────────────────────
  const validatePhone = (val) => {
    const digits = val.replace(/\D/g, '');
    if (!digits) return t('mobileNumber') + ' is required';
    if (digits.length < 10) return t('invalidMobile');
    return '';
  };

  const validateEmail = (val) => {
    if (!val.trim()) return t('emailAddress') + ' is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Enter a valid email address';
    return '';
  };

  const validatePassword = (val) => {
    if (!val) return 'Password is required';
    if (val.length < 8) return t('passwordTooShort');
    return '';
  };

  // ── Google sign-in ────────────────────────────────
  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true);
    setErrorMsg('');
    try {
      const user = await googleLogin(credentialResponse.credential, 'farmer');
      if (user?.needs_profile_completion) {
        navigate('/complete-profile');
      } else {
        navigate('/dashboard/farmer');
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail || t('authErrorGeneric'));
    } finally {
      setGoogleLoading(false);
    }
  };

  // Mock Google (dev only) — useful when no real client ID set
  const handleMockGoogle = async () => {
    setGoogleLoading(true);
    setErrorMsg('');
    try {
      const user = await googleLogin('mock_token', 'farmer');
      if (user?.needs_profile_completion) navigate('/complete-profile');
      else navigate('/dashboard/farmer');
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail || t('authErrorGeneric'));
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── Submit ────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const errs = {};

    if (authMode === 'otp') {
      const phoneErr = validatePhone(phone);
      if (phoneErr) errs.phone = phoneErr;
      const otpStr = otp.join('');
      if (otpStr.length < OTP_LENGTH) errs.otp = `Enter all ${OTP_LENGTH} digits`;
      if (Object.keys(errs).length) { setFieldErrors(errs); return; }
      setFieldErrors({});
      setSubmitting(true);
      try {
        await otpLogin({ phone, otp: otp.join(''), role: 'farmer' });
        navigate('/dashboard/farmer');
      } catch (err) {
        setErrorMsg(err?.response?.data?.detail || t('authErrorGeneric'));
      } finally {
        setSubmitting(false);
      }
    } else if (authMode === 'password') {
      const emailErr = validateEmail(email);
      const pwdErr = validatePassword(password);
      if (emailErr) errs.email = emailErr;
      if (pwdErr) errs.password = pwdErr;
      if (Object.keys(errs).length) { setFieldErrors(errs); return; }
      setFieldErrors({});
      setSubmitting(true);
      try {
        await login({ email, password, role: 'farmer' });
        navigate('/dashboard/farmer');
      } catch (err) {
        const detail = err?.response?.data?.detail || '';
        if (detail.toLowerCase().includes('google')) {
          setErrorMsg(t('googleAuthOnly'));
        } else {
          setErrorMsg(t('authErrorIncorrect'));
        }
      } finally {
        setSubmitting(false);
      }
    } else if (authMode === 'register') {
      if (!fullName.trim()) errs.fullName = 'Full name is required';
      if (!farmName.trim()) errs.farmName = 'Farm name is required';
      if (!location.trim()) errs.location = 'Location is required';
      const phoneErr = validatePhone(regPhone);
      if (phoneErr) errs.regPhone = phoneErr;
      const pwdErr = validatePassword(regPassword);
      if (pwdErr) errs.regPassword = pwdErr;
      if (Object.keys(errs).length) { setFieldErrors(errs); return; }
      setFieldErrors({});
      setSubmitting(true);
      try {
        await register({
          full_name: fullName, email: undefined, phone: regPhone,
          password: regPassword, role: 'farmer',
          farm_name: farmName, location,
        });
        navigate('/dashboard/farmer');
      } catch (err) {
        setErrorMsg(err?.response?.data?.detail || t('authErrorGeneric'));
      } finally {
        setSubmitting(false);
      }
    }
  };

  const isLoading = loading || submitting || googleLoading;
  const accentColor = 'var(--color-accent-farmer)';
  const accentBg = 'var(--color-accent-farmer-bg)';

  return (
    <AuthLayout
      role="farmer"
      headline={t('farmerLoginHeadline')}
      subline={t('farmerLoginSubline')}
      trustItems={[t('trustFarmers'), t('trustMiddlemen'), t('trustFresh')]}
    >
      {/* Role header */}
      <div className="auth-role-header">
        <div className="auth-role-icon" style={{ background: accentBg, color: accentColor }}>
          <Sprout size={26} />
        </div>
        <div>
          <div className="auth-role-title" style={{ color: accentColor }}>
            {authMode === 'register' ? 'Farmer Registration' : 'Farmer Login'}
          </div>
          <div className="auth-role-subtitle">
            {authMode === 'register'
              ? 'Register your farm and start selling direct'
              : 'Access your farm dashboard & produce catalog'}
          </div>
        </div>
      </div>

      {/* Google sign-in */}
      {authMode !== 'register' && (
        <>
          <GoogleSignInButton
            role="farmer"
            onSuccess={handleGoogleSuccess}
            onError={(msg) => setErrorMsg(msg)}
            loading={isLoading}
            t={t}
          />
          <div className="auth-or-divider">
            <span className="auth-or-text">{t('orSignInWith')}</span>
          </div>
        </>
      )}

      {/* Tab switcher */}
      <div className="auth-tabs-new" role="tablist">
        {[
          { key: 'otp', label: 'Mobile OTP' },
          { key: 'password', label: 'Email / Password' },
          { key: 'register', label: 'New Farmer' },
        ].map(tab => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={authMode === tab.key}
            className={`auth-tab-new${authMode === tab.key ? ' active' : ''}`}
            onClick={() => { setAuthMode(tab.key); setErrorMsg(''); setFieldErrors({}); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="auth-error-banner" role="alert" aria-live="assertive">
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* ── OTP Tab ── */}
        {authMode === 'otp' && (
          <>
            <div className="auth-form-group">
              <label htmlFor="farmer-phone" className="auth-label">{t('mobileNumber')}</label>
              <div className="auth-input-wrap">
                <Phone size={16} className="auth-input-icon" />
                <input
                  id="farmer-phone"
                  type="tel"
                  className={`auth-input focus-farmer${fieldErrors.phone ? ' error' : ''}`}
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); if (fieldErrors.phone) setFieldErrors(p => ({...p, phone: ''})); }}
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                  aria-describedby={fieldErrors.phone ? 'phone-err' : undefined}
                />
              </div>
              {fieldErrors.phone && <span id="phone-err" className="auth-field-error" role="alert"><AlertCircle size={12}/> {fieldErrors.phone}</span>}
            </div>

            <div className="auth-form-group">
              <label className="auth-label">{t('otp').split('(')[0].trim()}</label>
              <div className="otp-boxes" role="group" aria-label="One-time password">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className={`otp-box focus-farmer${digit ? ' filled' : ''}${fieldErrors.otp && !digit ? ' error' : ''}`}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={i === 0 ? handleOtpPaste : undefined}
                    aria-label={`OTP digit ${i + 1}`}
                    style={{ borderColor: fieldErrors.otp && !digit ? 'var(--color-danger)' : undefined }}
                  />
                ))}
              </div>
              {fieldErrors.otp && <span className="auth-field-error" role="alert"><AlertCircle size={12}/> {fieldErrors.otp}</span>}
              {import.meta.env.DEV && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: 4 }}>
                  Dev: demo OTP is <b>1234</b>
                </span>
              )}
              <div className="otp-resend-row">
                {otpCountdown > 0 ? (
                  <span className="otp-countdown">{t('resendIn')} {otpCountdown}s</span>
                ) : (
                  <button type="button" className="otp-resend-btn" onClick={handleResendOtp}>
                    {t('resendOtp')}
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Password Tab ── */}
        {authMode === 'password' && (
          <>
            <div className="auth-form-group">
              <label htmlFor="farmer-email" className="auth-label">{t('emailAddress')}</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="farmer-email"
                  type="email"
                  className={`auth-input focus-farmer${fieldErrors.email ? ' error' : ''}`}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors(p => ({...p, email: ''})); }}
                  placeholder="farmer@example.com"
                  autoComplete="email"
                  aria-describedby={fieldErrors.email ? 'email-err' : undefined}
                />
              </div>
              {fieldErrors.email && <span id="email-err" className="auth-field-error" role="alert"><AlertCircle size={12}/> {fieldErrors.email}</span>}
            </div>

            <div className="auth-form-group">
              <div className="auth-label-row">
                <label htmlFor="farmer-pwd" className="auth-label">{t('password')}</label>
                <Link to="/forgot-password" className="auth-forgot-link">{t('forgotPassword')}</Link>
              </div>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="farmer-pwd"
                  type={showPwd ? 'text' : 'password'}
                  className={`auth-input has-toggle focus-farmer${fieldErrors.password ? ' error' : ''}`}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors(p => ({...p, password: ''})); }}
                  autoComplete="current-password"
                  aria-describedby={fieldErrors.password ? 'pwd-err' : undefined}
                />
                <button type="button" className="auth-input-toggle" onClick={() => setShowPwd(p => !p)} aria-label="Toggle password visibility">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && <span id="pwd-err" className="auth-field-error" role="alert"><AlertCircle size={12}/> {fieldErrors.password}</span>}
            </div>

            <div className="auth-remember-row">
              <input
                type="checkbox"
                id="farmer-remember"
                className="auth-checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="farmer-remember" className="auth-remember-label">{t('rememberMe')}</label>
            </div>
          </>
        )}

        {/* ── Register Tab ── */}
        {authMode === 'register' && (
          <>
            <div className="auth-form-group">
              <label htmlFor="reg-name" className="auth-label">Full Name</label>
              <div className="auth-input-wrap">
                <User size={16} className="auth-input-icon" />
                <input id="reg-name" type="text" className={`auth-input focus-farmer${fieldErrors.fullName ? ' error' : ''}`}
                  value={fullName} onChange={(e) => { setFullName(e.target.value); if(fieldErrors.fullName) setFieldErrors(p=>({...p,fullName:''})); }}
                  placeholder="e.g. Ramesh Kumar" autoComplete="name" />
              </div>
              {fieldErrors.fullName && <span className="auth-field-error" role="alert"><AlertCircle size={12}/> {fieldErrors.fullName}</span>}
            </div>

            <div className="auth-form-group">
              <label htmlFor="reg-farm" className="auth-label">{t('farmName')}</label>
              <div className="auth-input-wrap">
                <Sprout size={16} className="auth-input-icon" />
                <input id="reg-farm" type="text" className={`auth-input focus-farmer${fieldErrors.farmName ? ' error' : ''}`}
                  value={farmName} onChange={(e) => { setFarmName(e.target.value); if(fieldErrors.farmName) setFieldErrors(p=>({...p,farmName:''})); }}
                  placeholder="e.g. Cauvery Organic Farms" />
              </div>
              {fieldErrors.farmName && <span className="auth-field-error" role="alert"><AlertCircle size={12}/> {fieldErrors.farmName}</span>}
            </div>

            <div className="auth-form-group">
              <label htmlFor="reg-location" className="auth-label">{t('farmLocation')}</label>
              <div className="auth-input-wrap">
                <MapPin size={16} className="auth-input-icon" />
                <input id="reg-location" type="text" className={`auth-input focus-farmer${fieldErrors.location ? ' error' : ''}`}
                  value={location} onChange={(e) => { setLocation(e.target.value); if(fieldErrors.location) setFieldErrors(p=>({...p,location:''})); }}
                  placeholder="e.g. Thanjavur, Tamil Nadu" />
              </div>
              {fieldErrors.location && <span className="auth-field-error" role="alert"><AlertCircle size={12}/> {fieldErrors.location}</span>}
            </div>

            <div className="auth-form-group">
              <label htmlFor="reg-phone" className="auth-label">{t('mobileNumber')}</label>
              <div className="auth-input-wrap">
                <Phone size={16} className="auth-input-icon" />
                <input id="reg-phone" type="tel" className={`auth-input focus-farmer${fieldErrors.regPhone ? ' error' : ''}`}
                  value={regPhone} onChange={(e) => { setRegPhone(e.target.value); if(fieldErrors.regPhone) setFieldErrors(p=>({...p,regPhone:''})); }}
                  placeholder="+91 98765 43210" autoComplete="tel" />
              </div>
              {fieldErrors.regPhone && <span className="auth-field-error" role="alert"><AlertCircle size={12}/> {fieldErrors.regPhone}</span>}
            </div>

            <div className="auth-form-group">
              <label htmlFor="reg-pwd" className="auth-label">Create Password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input id="reg-pwd" type={showRegPwd ? 'text' : 'password'} className={`auth-input has-toggle focus-farmer${fieldErrors.regPassword ? ' error' : ''}`}
                  value={regPassword} onChange={(e) => { setRegPassword(e.target.value); if(fieldErrors.regPassword) setFieldErrors(p=>({...p,regPassword:''})); }}
                  autoComplete="new-password" placeholder="min. 8 characters" />
                <button type="button" className="auth-input-toggle" onClick={() => setShowRegPwd(p=>!p)} aria-label="Toggle password visibility">
                  {showRegPwd ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
              {fieldErrors.regPassword && <span className="auth-field-error" role="alert"><AlertCircle size={12}/> {fieldErrors.regPassword}</span>}
            </div>
          </>
        )}

        <button
          type="submit"
          className="auth-submit-btn"
          disabled={isLoading}
          style={{ background: accentColor, color: '#fff' }}
        >
          {(submitting || loading) ? (
            <><div className="auth-spinner" /> {t('signingIn')}</>
          ) : authMode === 'register' ? 'Register Farm & Continue' : 'Sign in to Dashboard'}
        </button>
      </form>
    </AuthLayout>
  );
};
