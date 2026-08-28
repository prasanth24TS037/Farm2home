import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Mail, Lock, ArrowLeft } from 'lucide-react';

export const AdminLogin = () => {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('admin@farm2home.com');
  const [password, setPassword] = useState('Admin@123');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await login({ email, password, role: 'admin' });
      navigate('/dashboard/admin');
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Admin authentication failed.');
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            <ArrowLeft size={16} />
            <span>Public Home</span>
          </Link>
        </div>

        <div className="auth-header">
          <div className="auth-icon-circle" style={{ backgroundColor: 'var(--color-accent-admin-bg)', color: 'var(--color-accent-admin)' }}>
            <ShieldCheck size={28} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--color-accent-admin)' }}>
            Platform Administration
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Restricted internal control plane
          </p>
        </div>

        {errorMsg && (
          <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-danger-bg)', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', color: 'var(--color-danger)', fontSize: '0.875rem', marginBottom: '16px' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Admin Email</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@farm2home.com"
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
            className="btn btn-lg"
            style={{ width: '100%', marginTop: '8px', backgroundColor: 'var(--color-accent-admin)', color: '#ffffff' }}
            disabled={loading}
          >
            {loading ? 'Validating...' : 'Access Admin Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};
