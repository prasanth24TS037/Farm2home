import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { deliveryService } from '../../services/deliveryService';
import { 
  User, 
  ShieldCheck, 
  Power, 
  Truck, 
  Phone, 
  Mail, 
  FileText, 
  Globe, 
  LogOut, 
  Check, 
  Save,
  Award,
  AlertCircle
} from 'lucide-react';

export const DeliveryProfile = () => {
  const { user, updateProfile, logout } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const outletContext = useOutletContext() || {};
  const { isOnDuty, setIsOnDuty, refreshLayout } = outletContext;

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    vehicle_type: 'Electric Scooter',
    vehicle_number: '',
    license_number: ''
  });

  useEffect(() => {
    // Populate form from authenticated user profile and delivery profile
    if (user) {
      setProfileForm({
        full_name: user.full_name || '',
        phone: user.phone || '',
        email: user.email || '',
        vehicle_type: user.delivery?.vehicle_type || 'Electric Scooter',
        vehicle_number: user.delivery?.vehicle_number || '',
        license_number: user.delivery?.license_number || ''
      });
    }
  }, [user]);

  const handleToggleDuty = async () => {
    const newStatus = !isOnDuty;
    if (setIsOnDuty) setIsOnDuty(newStatus);
    try {
      await deliveryService.updateAvailability(newStatus);
      if (refreshLayout) refreshLayout();
    } catch (err) {
      console.error(err);
      if (setIsOnDuty) setIsOnDuty(!newStatus);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      await updateProfile({
        full_name: profileForm.full_name,
        phone: profileForm.phone,
        email: profileForm.email,
        vehicle_type: profileForm.vehicle_type,
        vehicle_number: profileForm.vehicle_number,
        license_number: profileForm.license_number
      });
      setSuccessMsg('Profile and vehicle details updated successfully!');
      if (refreshLayout) refreshLayout();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const agentName = user?.full_name || profileForm.full_name || 'Delivery Partner';
  const initial = agentName.charAt(0).toUpperCase() || 'D';

  return (
    <div style={{ padding: '0 20px' }}>
      {/* PROFILE HEADER HERO */}
      <div style={{
        backgroundColor: 'var(--color-bg-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        border: 'var(--border-hairline)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-accent-delivery)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          fontWeight: 700,
          boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)',
          flexShrink: 0
        }}>
          {initial}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-main)', margin: 0 }}>
              {agentName}
            </h2>
            <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
              Verified Partner
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {profileForm.phone || user?.phone || user?.email}
          </div>
          <div style={{ fontSize: '0.725rem', color: 'var(--color-accent-delivery)', fontWeight: 600, marginTop: '2px' }}>
            🌾 Farm2Home Direct Fleet
          </div>
        </div>
      </div>

      {/* SHIFT & ON-DUTY TOGGLE CARD */}
      <div style={{
        backgroundColor: isOnDuty ? '#f0fdf4' : 'var(--color-bg-surface)',
        padding: '16px',
        borderRadius: 'var(--radius-md)',
        border: isOnDuty ? '1px solid #bbf7d0' : 'var(--border-hairline)',
        marginBottom: '18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: isOnDuty ? '#166534' : 'var(--color-text-main)' }}>
            {t('shiftStatus', 'Shift & Availability Status')}
          </div>
          <div style={{ fontSize: '0.75rem', color: isOnDuty ? '#15803d' : 'var(--color-text-muted)', marginTop: '2px' }}>
            {isOnDuty 
              ? '● On Duty — Receiving active farm dispatches' 
              : '○ Off Duty — Dispatches paused'}
          </div>
        </div>
        <button
          onClick={handleToggleDuty}
          className={`btn btn-sm ${isOnDuty ? 'btn-danger' : 'btn-accent-delivery'}`}
          style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <Power size={14} />
          {isOnDuty ? t('offDuty', 'Go Off Duty') : t('onDuty', 'Go On Duty')}
        </button>
      </div>

      {/* VERIFICATION & KYC BADGES */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        <div style={{ padding: '12px 10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <ShieldCheck size={20} color="#16a34a" style={{ margin: '0 auto 4px' }} />
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534' }}>Verified</div>
          <div style={{ fontSize: '0.675rem', color: '#15803d' }}>Driving License</div>
        </div>

        <div style={{ padding: '12px 10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <ShieldCheck size={20} color="#16a34a" style={{ margin: '0 auto 4px' }} />
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534' }}>Verified</div>
          <div style={{ fontSize: '0.675rem', color: '#15803d' }}>Vehicle RC</div>
        </div>

        <div style={{ padding: '12px 10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <ShieldCheck size={20} color="#16a34a" style={{ margin: '0 auto 4px' }} />
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534' }}>Verified</div>
          <div style={{ fontSize: '0.675rem', color: '#15803d' }}>Identity KYC</div>
        </div>
      </div>

      {successMsg && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 'var(--radius-md)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.8125rem',
          color: '#166534',
          fontWeight: 600
        }}>
          <Check size={16} /> {successMsg}
        </div>
      )}

      {/* EDITABLE PROFILE & VEHICLE DETAILS FORM */}
      <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
        <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-main)', borderBottom: 'var(--border-hairline)', paddingBottom: '6px' }}>
          Personal & Contact Information
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600 }}>Full Name</label>
          <input
            type="text"
            className="form-input"
            value={profileForm.full_name}
            onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
            required
          />
        </div>
        
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600 }}>Mobile Number</label>
          <input
            type="tel"
            className="form-input"
            value={profileForm.phone}
            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            placeholder="+91 98765 43210"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600 }}>Email Address</label>
          <input
            type="email"
            className="form-input"
            value={profileForm.email}
            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
            placeholder="delivery@farm2home.com"
          />
        </div>

        {/* VEHICLE SECTION ANCHOR */}
        <div id="vehicle" style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-main)', borderBottom: 'var(--border-hairline)', paddingBottom: '6px', marginTop: '10px' }}>
          {t('vehicleInfo', 'Vehicle & License Details')}
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600 }}>Vehicle Type</label>
          <select 
            className="form-input"
            value={profileForm.vehicle_type}
            onChange={(e) => setProfileForm({ ...profileForm, vehicle_type: e.target.value })}
          >
            <option value="Electric Scooter">Electric Scooter</option>
            <option value="Motorcycle">Motorcycle</option>
            <option value="EV Bike">EV Bike (Ather/Ola)</option>
            <option value="Bicycle">Bicycle</option>
            <option value="Delivery Van">Delivery Van</option>
            <option value="EV 3-Wheeler">EV 3-Wheeler</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600 }}>Vehicle Registration Number</label>
          <input
            type="text"
            className="form-input"
            value={profileForm.vehicle_number}
            onChange={(e) => setProfileForm({ ...profileForm, vehicle_number: e.target.value })}
            placeholder="e.g. TN-09-EV-4421"
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600 }}>Driving License Number</label>
          <input
            type="text"
            className="form-input"
            value={profileForm.license_number}
            onChange={(e) => setProfileForm({ ...profileForm, license_number: e.target.value })}
            placeholder="e.g. DL-TN-2023-88273"
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-accent-delivery" 
          disabled={saving} 
          style={{ marginTop: '8px', padding: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Save size={16} />
          {saving ? 'Saving Changes...' : t('saveProfile', 'Save Profile & Vehicle Details')}
        </button>
      </form>

      {/* LANGUAGE PREFERENCE SECTION */}
      <div style={{
        backgroundColor: 'var(--color-bg-surface)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        border: 'var(--border-hairline)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Globe size={18} color="var(--color-accent-delivery)" />
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Preferred Language</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <button
            type="button"
            className="btn"
            style={{
              padding: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              backgroundColor: lang === 'en' ? 'var(--color-accent-delivery)' : 'var(--color-bg-subtle)',
              color: lang === 'en' ? '#ffffff' : 'var(--color-text-main)',
              border: 'var(--border-hairline)'
            }}
            onClick={() => setLang('en')}
          >
            English
          </button>

          <button
            type="button"
            className="btn"
            style={{
              padding: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              backgroundColor: lang === 'ta' ? 'var(--color-accent-delivery)' : 'var(--color-bg-subtle)',
              color: lang === 'ta' ? '#ffffff' : 'var(--color-text-main)',
              border: 'var(--border-hairline)'
            }}
            onClick={() => setLang('ta')}
          >
            தமிழ்
          </button>

          <button
            type="button"
            className="btn"
            style={{
              padding: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              backgroundColor: lang === 'hi' ? 'var(--color-accent-delivery)' : 'var(--color-bg-subtle)',
              color: lang === 'hi' ? '#ffffff' : 'var(--color-text-main)',
              border: 'var(--border-hairline)'
            }}
            onClick={() => setLang('hi')}
          >
            हिन्दी
          </button>
        </div>
      </div>

      {/* SIGN OUT BUTTON */}
      <button
        onClick={() => {
          if (window.confirm("Are you sure you want to sign out?")) {
            logout();
            navigate('/login/delivery');
          }
        }}
        className="btn btn-secondary"
        style={{
          width: '100%',
          padding: '12px',
          fontWeight: 600,
          color: 'var(--color-danger)',
          borderColor: 'var(--color-danger)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          marginBottom: '20px'
        }}
      >
        <LogOut size={16} /> Sign Out of Delivery Partner Portal
      </button>
    </div>
  );
};
