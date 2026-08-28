import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, Mail, Lock, User, ArrowLeft, MapPin } from 'lucide-react';
import { LanguageToggle } from '../components/common/LanguageToggle';

export const CustomerLogin = () => {
  const navigate = useNavigate();
  const { login, register, loading } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('customer@farm2home.com');
  const [password, setPassword] = useState('Customer@123');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (isRegister) {
        await register({
          full_name: fullName,
          email,
          password,
          role: 'customer',
          delivery_address: address
        });
      } else {
        await login({ email, password, role: 'customer' });
      }
      navigate('/dashboard/customer');
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Authentication failed.');
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
          <div className="auth-icon-circle" style={{ backgroundColor: 'var(--color-accent-customer-bg)', color: 'var(--color-accent-customer)' }}>
            <ShoppingBag size={28} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--color-accent-customer)' }}>
            {isRegister ? 'Customer Sign Up' : 'Customer Login'}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {isRegister ? 'Create an account to shop farm-fresh harvest' : 'Sign in to order harvest fresh organic produce'}
          </p>
        </div>

        <div className="auth-tabs">
          <div
            className={`auth-tab ${!isRegister ? 'active' : ''}`}
            onClick={() => setIsRegister(false)}
          >
            Sign In
          </div>
          <div
            className={`auth-tab ${isRegister ? 'active' : ''}`}
            onClick={() => setIsRegister(true)}
          >
            Create Account
          </div>
        </div>

        {errorMsg && (
          <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-danger-bg)', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', color: 'var(--color-danger)', fontSize: '0.875rem', marginBottom: '16px' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Priya Sharma"
                    required
                    style={{ paddingLeft: '38px' }}
                  />
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-text-muted)' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Delivery Address</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Apartment, Street, Area, City"
                    required
                    style={{ paddingLeft: '38px' }}
                  />
                  <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-text-muted)' }} />
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@farm2home.com"
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

          <button
            type="submit"
            className="btn btn-accent-customer btn-lg"
            style={{ width: '100%', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : (isRegister ? 'Register & Start Shopping' : 'Sign In')}
          </button>
        </form>
      </div>
    </div>
  );
};
