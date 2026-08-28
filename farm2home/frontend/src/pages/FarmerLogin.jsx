import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { Sprout, Phone, Mail, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const FarmerLogin = () => {
  const navigate = useNavigate();
  const { login, otpLogin, register, loading } = useAuth();
  const { t } = useLanguage();

  const [authMode, setAuthMode] = useState('otp'); // 'otp', 'password', 'register'
  const [phone, setPhone] = useState('+91 98765 43210');
  const [otp, setOtp] = useState('1234');
  const [email, setEmail] = useState('farmer@farm2home.com');
  const [password, setPassword] = useState('Farmer@123');

  // Register fields
  const [fullName, setFullName] = useState('');
  const [farmName, setFarmName] = useState('');
  const [location, setLocation] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      if (authMode === 'otp') {
        await otpLogin({ phone, otp, role: 'farmer' });
      } else if (authMode === 'password') {
        await login({ email, password, role: 'farmer' });
      } else if (authMode === 'register') {
        await register({
          full_name: fullName,
          email: email || undefined,
          phone: phone || undefined,
          password,
          role: 'farmer',
          farm_name: farmName,
          location
        });
      }
      navigate('/dashboard/farmer');
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Authentication failed. Please check details.');
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            <ArrowLeft size={16} />
            <span>Back</span>
          </Link>
          <LanguageToggle />
        </div>

        <div className="auth-header">
          <div className="auth-icon-circle" style={{ backgroundColor: 'var(--color-accent-farmer-bg)', color: 'var(--color-accent-farmer)' }}>
            <Sprout size={28} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--color-accent-farmer)' }}>
            {authMode === 'register' ? 'Farmer Registration' : 'Farmer Login'}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {authMode === 'register' ? 'Register your farm and start selling direct' : 'Access your farm dashboard & produce catalog'}
          </p>
        </div>

        {/* Tab Selection */}
        <div className="auth-tabs">
          <div
            className={`auth-tab ${authMode === 'otp' ? 'active' : ''}`}
            onClick={() => setAuthMode('otp')}
          >
            Mobile OTP
          </div>
          <div
            className={`auth-tab ${authMode === 'password' ? 'active' : ''}`}
            onClick={() => setAuthMode('password')}
          >
            Email / Password
          </div>
          <div
            className={`auth-tab ${authMode === 'register' ? 'active' : ''}`}
            onClick={() => setAuthMode('register')}
          >
            New Farmer
          </div>
        </div>

        {errorMsg && (
          <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-danger-bg)', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', color: 'var(--color-danger)', fontSize: '0.875rem', marginBottom: '16px' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {authMode === 'otp' && (
            <>
              <div className="form-group">
                <label className="form-label">Mobile Number</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    required
                    style={{ paddingLeft: '38px' }}
                  />
                  <Phone size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-text-muted)' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">One-Time Password (OTP)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 1234"
                    required
                    style={{ paddingLeft: '38px', letterSpacing: '2px', fontWeight: 600 }}
                  />
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-text-muted)' }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '4px' }}>
                  Tip: Demo OTP is <b>1234</b>
                </span>
              </div>
            </>
          )}

          {authMode === 'password' && (
            <>
              <div className="form-group">
                <label className="form-label">Email Address or Phone</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="farmer@farm2home.com"
                    required
                    style={{ paddingLeft: '38px' }}
                  />
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-text-muted)' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{ paddingLeft: '38px' }}
                  />
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-text-muted)' }} />
                </div>
              </div>
            </>
          )}

          {authMode === 'register' && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Farm / Village Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  placeholder="e.g. Cauvery Organic Farms"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">District & State</label>
                <input
                  type="text"
                  className="form-input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Thanjavur, Tamil Nadu"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mobile Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Create Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="btn btn-accent-farmer btn-lg"
            style={{ width: '100%', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? 'Processing...' : (authMode === 'register' ? 'Register Farm & Continue' : 'Sign in to Dashboard')}
          </button>
        </form>
      </div>
    </div>
  );
};
