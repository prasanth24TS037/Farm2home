import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AuthLayout } from '../components/auth/AuthLayout';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { ShoppingBag, Mail, Lock, Eye, EyeOff, User, MapPin, AlertCircle } from 'lucide-react';

export const CustomerLogin = () => {
  const navigate = useNavigate();
  const { login, register, googleLogin, loading } = useAuth();
  const { t } = useLanguage();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState(import.meta.env.DEV ? 'customer@farm2home.com' : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? 'Customer@123' : '');
  const [showPwd, setShowPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPwd, setShowRegPwd] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true); setErrorMsg('');
    try {
      const user = await googleLogin(credentialResponse.credential, 'customer');
      if (user?.needs_profile_completion) navigate('/complete-profile');
      else navigate('/dashboard/customer');
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail || t('authErrorGeneric'));
    } finally { setGoogleLoading(false); }
  };

  const handleMockGoogle = async () => {
    setGoogleLoading(true); setErrorMsg('');
    try {
      const user = await googleLogin('mock_token', 'customer');
      if (user?.needs_profile_completion) navigate('/complete-profile');
      else navigate('/dashboard/customer');
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail || t('authErrorGeneric'));
    } finally { setGoogleLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const errs = {};

    if (isRegister) {
      if (!fullName.trim()) errs.fullName = 'Full name is required';
      if (!address.trim()) errs.address = 'Delivery address is required';
      const emailErr = validateEmail(regEmail);
      if (emailErr) errs.regEmail = emailErr;
      const pwdErr = validatePassword(regPassword);
      if (pwdErr) errs.regPassword = pwdErr;
      if (Object.keys(errs).length) { setFieldErrors(errs); return; }
      setFieldErrors({});
      setSubmitting(true);
      try {
        await register({ full_name: fullName, email: regEmail, password: regPassword, role: 'customer', delivery_address: address });
        navigate('/dashboard/customer');
      } catch (err) {
        setErrorMsg(err?.response?.data?.detail || t('authErrorGeneric'));
      } finally { setSubmitting(false); }
    } else {
      const emailErr = validateEmail(email);
      const pwdErr = validatePassword(password);
      if (emailErr) errs.email = emailErr;
      if (pwdErr) errs.password = pwdErr;
      if (Object.keys(errs).length) { setFieldErrors(errs); return; }
      setFieldErrors({});
      setSubmitting(true);
      try {
        await login({ email, password, role: 'customer' });
        navigate('/dashboard/customer');
      } catch (err) {
        const detail = err?.response?.data?.detail || '';
        if (detail.toLowerCase().includes('google')) setErrorMsg(t('googleAuthOnly'));
        else setErrorMsg(t('authErrorIncorrect'));
      } finally { setSubmitting(false); }
    }
  };

  const isLoading = loading || submitting || googleLoading;
  const accentColor = 'var(--color-accent-customer)';
  const accentBg = 'var(--color-accent-customer-bg)';

  return (
    <AuthLayout
      role="customer"
      headline={t('customerLoginHeadline')}
      subline={t('customerLoginSubline')}
      trustItems={[t('trustFarmers'), t('trustMiddlemen'), t('trustFresh')]}
    >
      {/* Role header */}
      <div className="auth-role-header">
        <div className="auth-role-icon" style={{ background: accentBg, color: accentColor }}>
          <ShoppingBag size={26} />
        </div>
        <div>
          <div className="auth-role-title" style={{ color: accentColor }}>
            {isRegister ? 'Customer Sign Up' : 'Customer Login'}
          </div>
          <div className="auth-role-subtitle">
            {isRegister ? 'Create an account to shop farm-fresh harvest' : 'Sign in to order harvest fresh organic produce'}
          </div>
        </div>
      </div>

      {/* Google sign-in */}
      {!isRegister && (
        <>
          <GoogleSignInButton
            role="customer"
            onSuccess={handleGoogleSuccess}
            onError={(msg) => setErrorMsg(msg)}
            loading={isLoading}
            t={t}
          />
          <div className="auth-or-divider"><span className="auth-or-text">{t('orSignInWith')}</span></div>
        </>
      )}

      {/* Tabs */}
      <div className="auth-tabs-new" role="tablist">
        {[
          { key: false, label: 'Sign In' },
          { key: true, label: 'Create Account' },
        ].map(tab => (
          <button
            key={String(tab.key)}
            role="tab"
            aria-selected={isRegister === tab.key}
            className={`auth-tab-new${isRegister === tab.key ? ' active' : ''}`}
            onClick={() => { setIsRegister(tab.key); setErrorMsg(''); setFieldErrors({}); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="auth-error-banner" role="alert" aria-live="assertive">
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* ── Register ── */}
        {isRegister && (
          <>
            <div className="auth-form-group">
              <label htmlFor="cust-name" className="auth-label">Full Name</label>
              <div className="auth-input-wrap">
                <User size={16} className="auth-input-icon" />
                <input id="cust-name" type="text" className={`auth-input focus-customer${fieldErrors.fullName ? ' error' : ''}`}
                  value={fullName} onChange={(e) => { setFullName(e.target.value); if(fieldErrors.fullName) setFieldErrors(p=>({...p,fullName:''})); }}
                  placeholder="Priya Sharma" autoComplete="name" autoFocus />
              </div>
              {fieldErrors.fullName && <span className="auth-field-error" role="alert"><AlertCircle size={12}/> {fieldErrors.fullName}</span>}
            </div>

            <div className="auth-form-group">
              <label htmlFor="cust-address" className="auth-label">{t('deliveryAddress')}</label>
              <div className="auth-input-wrap">
                <MapPin size={16} className="auth-input-icon" />
                <input id="cust-address" type="text" className={`auth-input focus-customer${fieldErrors.address ? ' error' : ''}`}
                  value={address} onChange={(e) => { setAddress(e.target.value); if(fieldErrors.address) setFieldErrors(p=>({...p,address:''})); }}
                  placeholder="Apartment, Street, Area, City" />
              </div>
              {fieldErrors.address && <span className="auth-field-error" role="alert"><AlertCircle size={12}/> {fieldErrors.address}</span>}
            </div>

            <div className="auth-form-group">
              <label htmlFor="cust-reg-email" className="auth-label">{t('emailAddress')}</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input id="cust-reg-email" type="email" className={`auth-input focus-customer${fieldErrors.regEmail ? ' error' : ''}`}
                  value={regEmail} onChange={(e) => { setRegEmail(e.target.value); if(fieldErrors.regEmail) setFieldErrors(p=>({...p,regEmail:''})); }}
                  placeholder="priya@example.com" autoComplete="email" />
              </div>
              {fieldErrors.regEmail && <span className="auth-field-error" role="alert"><AlertCircle size={12}/> {fieldErrors.regEmail}</span>}
            </div>

            <div className="auth-form-group">
              <label htmlFor="cust-reg-pwd" className="auth-label">Create Password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input id="cust-reg-pwd" type={showRegPwd ? 'text' : 'password'} className={`auth-input has-toggle focus-customer${fieldErrors.regPassword ? ' error' : ''}`}
                  value={regPassword} onChange={(e) => { setRegPassword(e.target.value); if(fieldErrors.regPassword) setFieldErrors(p=>({...p,regPassword:''})); }}
                  autoComplete="new-password" placeholder="min. 8 characters" />
                <button type="button" className="auth-input-toggle" onClick={() => setShowRegPwd(p=>!p)} aria-label="Toggle">
                  {showRegPwd ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
              {fieldErrors.regPassword && <span className="auth-field-error" role="alert"><AlertCircle size={12}/> {fieldErrors.regPassword}</span>}
            </div>
          </>
        )}

        {/* ── Sign In ── */}
        {!isRegister && (
          <>
            <div className="auth-form-group">
              <label htmlFor="cust-email" className="auth-label">{t('emailAddress')}</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input id="cust-email" type="email" className={`auth-input focus-customer${fieldErrors.email ? ' error' : ''}`}
                  value={email} onChange={(e) => { setEmail(e.target.value); if(fieldErrors.email) setFieldErrors(p=>({...p,email:''})); }}
                  placeholder="customer@example.com" autoComplete="email" />
              </div>
              {fieldErrors.email && <span className="auth-field-error" role="alert"><AlertCircle size={12}/> {fieldErrors.email}</span>}
            </div>

            <div className="auth-form-group">
              <div className="auth-label-row">
                <label htmlFor="cust-pwd" className="auth-label">{t('password')}</label>
                <Link to="/forgot-password" className="auth-forgot-link">{t('forgotPassword')}</Link>
              </div>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input id="cust-pwd" type={showPwd ? 'text' : 'password'} className={`auth-input has-toggle focus-customer${fieldErrors.password ? ' error' : ''}`}
                  value={password} onChange={(e) => { setPassword(e.target.value); if(fieldErrors.password) setFieldErrors(p=>({...p,password:''})); }}
                  autoComplete="current-password" />
                <button type="button" className="auth-input-toggle" onClick={() => setShowPwd(p=>!p)} aria-label="Toggle password visibility">
                  {showPwd ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
              {fieldErrors.password && <span className="auth-field-error" role="alert"><AlertCircle size={12}/> {fieldErrors.password}</span>}
            </div>

            <div className="auth-remember-row">
              <input type="checkbox" id="cust-remember" className="auth-checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              <label htmlFor="cust-remember" className="auth-remember-label">{t('rememberMe')}</label>
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
          ) : isRegister ? 'Register & Start Shopping' : 'Sign In'}
        </button>
      </form>
    </AuthLayout>
  );
};
