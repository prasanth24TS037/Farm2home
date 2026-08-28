import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Truck, Mail, Lock, User, ArrowLeft, Shield } from 'lucide-react';
import { LanguageToggle } from '../components/common/LanguageToggle';

export const DeliveryLogin = () => {
  const navigate = useNavigate();
  const { login, register, loading } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('delivery@farm2home.com');
  const [password, setPassword] = useState('Delivery@123');
  const [fullName, setFullName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
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
          role: 'delivery',
          vehicle_number: vehicleNumber
        });
      } else {
        await login({ email, password, role: 'delivery' });
      }
      navigate('/dashboard/delivery');
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
          <div className="auth-icon-circle" style={{ backgroundColor: 'var(--color-accent-delivery-bg)', color: 'var(--color-accent-delivery)' }}>
            <Truck size={28} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--color-accent-delivery)' }}>
            {isRegister ? 'Delivery Partner Sign Up' : 'Delivery Partner Login'}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {isRegister ? 'Join our fleet to deliver fresh harvests' : 'Access active delivery routes and payouts'}
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
            Apply as Partner
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
                    placeholder="Murugan Vel"
                    required
                    style={{ paddingLeft: '38px' }}
                  />
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-text-muted)' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Vehicle Registration No.</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="TN-09-EV-4421"
                    required
                    style={{ paddingLeft: '38px' }}
                  />
                  <Shield size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-text-muted)' }} />
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
                placeholder="delivery@farm2home.com"
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
            className="btn btn-accent-delivery btn-lg"
            style={{ width: '100%', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : (isRegister ? 'Register Fleet Partner' : 'Sign in to Console')}
          </button>
        </form>
      </div>
    </div>
  );
};
