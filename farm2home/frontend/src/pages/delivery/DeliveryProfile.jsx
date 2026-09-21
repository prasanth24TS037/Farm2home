import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useOutletContext } from 'react-router-dom';
import { deliveryService } from '../../services/deliveryService';
import { User, ShieldAlert, Power } from 'lucide-react';

export const DeliveryProfile = () => {
  const { user, updateProfile } = useAuth();
  const { t } = useLanguage();
  const { isOnDuty, setIsOnDuty } = useOutletContext();
  
  const [saving, setSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    vehicle_type: 'Electric Scooter',
    vehicle_number: 'TN-09-EV-4421'
  });

  const handleToggleDuty = async () => {
    const newStatus = !isOnDuty;
    setIsOnDuty(newStatus);
    try {
      await deliveryService.updateAvailability(newStatus);
    } catch (err) {
      console.error(err);
      setIsOnDuty(!newStatus);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        full_name: profileForm.full_name,
        phone: profileForm.phone,
        email: profileForm.email
      });
      alert('Profile updated successfully');
    } catch (err) {
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '0 20px' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>{t('profile', 'My Profile')}</h2>

      <div style={{ backgroundColor: 'var(--color-bg-surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: 'var(--border-hairline)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Shift Status</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {isOnDuty ? 'Receiving new delivery assignments' : 'Not receiving new assignments'}
          </div>
        </div>
        <button
          onClick={handleToggleDuty}
          className={`btn ${isOnDuty ? 'btn-danger' : 'btn-accent-delivery'}`}
        >
          <Power size={16} style={{ marginRight: '4px' }} />
          {isOnDuty ? 'Go Off Duty' : 'Go On Duty'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <div style={{ flex: 1, padding: '12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={16} color="#15803d" />
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d' }}>KYC Verified</div>
            <div style={{ fontSize: '0.7rem', color: '#166534' }}>Driving License</div>
          </div>
        </div>
        <div style={{ flex: 1, padding: '12px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={16} color="#b45309" />
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#b45309' }}>Pending</div>
            <div style={{ fontSize: '0.7rem', color: '#92400e' }}>Vehicle RC</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input
            type="text"
            className="form-input"
            value={profileForm.full_name}
            onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
            required
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Phone Number</label>
          <input
            type="tel"
            className="form-input"
            value={profileForm.phone}
            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Vehicle Type</label>
          <select 
            className="form-input"
            value={profileForm.vehicle_type}
            onChange={(e) => setProfileForm({ ...profileForm, vehicle_type: e.target.value })}
          >
            <option value="Electric Scooter">Electric Scooter</option>
            <option value="Motorcycle">Motorcycle</option>
            <option value="Bicycle">Bicycle</option>
            <option value="Van">Delivery Van</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Vehicle Registration Number</label>
          <input
            type="text"
            className="form-input"
            value={profileForm.vehicle_number}
            onChange={(e) => setProfileForm({ ...profileForm, vehicle_number: e.target.value })}
          />
        </div>

        <button type="submit" className="btn btn-accent-delivery" disabled={saving} style={{ marginTop: '8px' }}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
};
