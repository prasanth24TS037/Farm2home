import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { deliveryService } from '../../services/deliveryService';
import { Navigation, MapPin } from 'lucide-react';

export const DeliveryRoute = () => {
  const { t } = useLanguage();
  const [route, setRoute] = useState([]);
  const [estimatedDistance, setEstimatedDistance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    deliveryService.getRoute()
      .then(data => {
        setRoute(data.route);
        setEstimatedDistance(data.estimated_total_distance);
      })
      .finally(() => setLoading(false));
  }, []);

  const openGoogleMaps = (lat, lng) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading route...</div>;

  return (
    <div style={{ padding: '0 20px' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Suggested Route</h2>
      
      {/* Mock Map / Map Placeholder */}
      <div style={{ height: '200px', backgroundColor: '#e2e8f0', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', border: 'var(--border-hairline)', marginBottom: '20px' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.15, backgroundImage: 'radial-gradient(#0f172a 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 2 }}>
          <MapPin size={32} color="var(--color-primary)" />
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Live Map Integration Placeholder</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Nearest Neighbor Optimization active via API</span>
        </div>
      </div>
      
      <div className="flex-between" style={{ marginBottom: '16px', backgroundColor: 'var(--color-bg-surface)', padding: '12px', borderRadius: 'var(--radius-sm)', border: 'var(--border-hairline)' }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Total Estimated Distance:</span>
        <span style={{ fontSize: '1rem', fontWeight: 600 }}>{estimatedDistance} km</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {route.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)' }}>
            No active stops.
          </div>
        ) : (
          route.map((stop, index) => (
            <div key={index} className="location-route-step" onClick={() => openGoogleMaps(stop.lat, stop.lng)} style={{ cursor: 'pointer', backgroundColor: 'var(--color-bg-surface)', border: 'var(--border-hairline)' }}>
              <div className={`pin-icon-box ${stop.type === 'pickup' ? 'pin-pickup' : 'pin-drop'}`}>
                <MapPin size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: stop.type === 'pickup' ? 'var(--color-success)' : 'var(--color-danger)', textTransform: 'uppercase' }}>
                  {index + 1}. {stop.type === 'pickup' ? t('pickup', 'Pickup') : t('drop', 'Drop')}
                </div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>{stop.name}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{stop.address}</div>
              </div>
              <button className="icon-btn" style={{ width: '36px', height: '36px', backgroundColor: 'var(--color-bg-app)' }} title="Open in Maps">
                <Navigation size={16} color="var(--color-accent-delivery)" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
