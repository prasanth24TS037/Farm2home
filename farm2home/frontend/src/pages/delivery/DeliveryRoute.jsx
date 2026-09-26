import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { deliveryService } from '../../services/deliveryService';
import { 
  Navigation, 
  MapPin, 
  Phone, 
  Clock, 
  ExternalLink, 
  Package, 
  Route as RouteIcon, 
  RefreshCw,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export const DeliveryRoute = () => {
  const { t } = useLanguage();
  const [routeData, setRouteData] = useState({ route: [], total_stops: 0, estimated_total_distance: 0, estimated_total_time_mins: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStop, setSelectedStop] = useState(null);

  const fetchRoute = async () => {
    try {
      const data = await deliveryService.getRoute();
      setRouteData(data || { route: [] });
      if (data.route && data.route.length > 0) {
        setSelectedStop(data.route[0]);
      }
    } catch (err) {
      console.error("Route load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRoute();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRoute();
  };

  const openGoogleMaps = (lat, lng) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <RouteIcon size={32} color="var(--color-accent-delivery)" style={{ animation: 'pulse 1.5s infinite', margin: '0 auto 12px' }} />
        <div>Computing optimal route sequence...</div>
      </div>
    );
  }

  const stops = routeData.route || [];

  return (
    <div style={{ padding: '0 20px' }}>
      {/* HEADER WITH REFRESH */}
      <div className="flex-between" style={{ marginBottom: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
            {t('suggestedRoute', 'Suggested Delivery Route')}
          </h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Nearest-Neighbor Dispatch Sequence
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="icon-btn"
          style={{ width: '36px', height: '36px', border: 'var(--border-hairline)' }}
          title="Recalculate Route"
        >
          <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* ROUTE SUMMARY STATS STRIP */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '10px',
        backgroundColor: 'var(--color-bg-surface)',
        padding: '12px 14px',
        borderRadius: 'var(--radius-md)',
        border: 'var(--border-hairline)',
        marginBottom: '16px'
      }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Total Stops</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '2px' }}>
            {stops.length}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Est. Distance</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-accent-delivery)', marginTop: '2px' }}>
            {routeData.estimated_total_distance || 0} km
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Est. Travel</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-success)', marginTop: '2px' }}>
            ~{routeData.estimated_total_time_mins || (stops.length * 15)} min
          </div>
        </div>
      </div>

      {/* INTERACTIVE ROUTE MAP CONTAINER */}
      <div style={{
        backgroundColor: '#0f172a',
        borderRadius: 'var(--radius-lg)',
        height: '210px',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid #1e293b',
        marginBottom: '20px',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.15)'
      }}>
        {/* Map Grid Pattern */}
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.2,
          backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
          backgroundSize: '16px 16px'
        }} />

        {/* Live Route Visualization SVG */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }}>
          <defs>
            <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#16a34a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          {/* Polyline connecting stops */}
          {stops.length > 1 && (
            <path
              d={stops.map((s, idx) => {
                const x = 50 + (idx * (280 / Math.max(1, stops.length - 1)));
                const y = idx % 2 === 0 ? 140 : 60;
                return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              fill="none"
              stroke="url(#routeGrad)"
              strokeWidth="3"
              strokeDasharray="6 4"
            />
          )}

          {/* Stop Nodes on Map */}
          {stops.map((stop, idx) => {
            const x = 50 + (idx * (280 / Math.max(1, stops.length - 1)));
            const y = idx % 2 === 0 ? 140 : 60;
            const isPickup = stop.type === 'pickup';
            const isSelected = selectedStop?.stop_number === stop.stop_number;

            return (
              <g 
                key={idx} 
                onClick={() => setSelectedStop(stop)} 
                style={{ cursor: 'pointer' }}
              >
                {/* Pulse Ring */}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? "18" : "14"}
                  fill={isPickup ? "rgba(22, 163, 74, 0.25)" : "rgba(239, 68, 68, 0.25)"}
                />
                {/* Core Circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? "12" : "10"}
                  fill={isPickup ? "#16a34a" : "#ef4444"}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                {/* Stop Number text */}
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {stop.stop_number || idx + 1}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Map Status Overlay */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 2,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '6px 10px',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
          <span style={{ fontSize: '0.725rem', color: '#f8fafc', fontWeight: 500 }}>
            GPS Live Dispatch Matrix Active
          </span>
        </div>

        {/* Quick Launch Google Navigation for Selected Stop */}
        {selectedStop && (
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '12px',
            right: '12px',
            zIndex: 2,
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                Stop {selectedStop.stop_number}: {selectedStop.name}
              </div>
              <div style={{ fontSize: '0.675rem', color: '#94a3b8', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {selectedStop.address}
              </div>
            </div>
            <button
              onClick={() => openGoogleMaps(selectedStop.lat, selectedStop.lng)}
              className="btn btn-sm"
              style={{
                backgroundColor: 'var(--color-accent-delivery)',
                color: '#ffffff',
                border: 'none',
                padding: '5px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                flexShrink: 0
              }}
            >
              <Navigation size={12} /> Maps
            </button>
          </div>
        )}
      </div>

      {/* SEQUENCED STOPS LIST */}
      <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text-main)' }}>
        Stop-by-Stop Order ({stops.length})
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {stops.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '36px 20px',
            backgroundColor: 'var(--color-bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: 'var(--border-hairline)',
            color: 'var(--color-text-muted)'
          }}>
            <CheckCircle2 size={32} color="var(--color-success)" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
              No Active Delivery Route
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
              Accept assignments from the Home tab to build today's route.
            </div>
          </div>
        ) : (
          stops.map((stop, index) => {
            const isPickup = stop.type === 'pickup';
            return (
              <div
                key={index}
                className="location-route-step"
                style={{
                  backgroundColor: 'var(--color-bg-surface)',
                  border: 'var(--border-hairline)',
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  transition: 'border-color var(--transition-fast)'
                }}
              >
                {/* Numbered Stop Badge */}
                <div 
                  className={`pin-icon-box ${isPickup ? 'pin-pickup' : 'pin-drop'}`}
                  style={{
                    fontWeight: 700,
                    fontSize: '0.8125rem'
                  }}
                >
                  {stop.stop_number || index + 1}
                </div>

                {/* Stop Information */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span 
                      className={`badge ${isPickup ? 'badge-success' : 'badge-danger'}`} 
                      style={{ fontSize: '0.675rem', padding: '1px 6px', fontWeight: 700 }}
                    >
                      {isPickup ? 'PICKUP (FARM)' : 'DROP (CUSTOMER)'}
                    </span>
                    <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      {stop.order_number}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                    {stop.name}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '2px', lineHeight: 1.35 }}>
                    {stop.address}
                  </div>

                  {stop.items_summary && (
                    <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Package size={12} color="var(--color-accent-delivery)" />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {stop.items_summary}
                      </span>
                    </div>
                  )}

                  <div style={{ fontSize: '0.725rem', color: 'var(--color-text-light)', marginTop: '4px' }}>
                    ~{stop.distance_km} km · ETA: ~{stop.eta_mins} mins
                  </div>
                </div>

                {/* Direct Action Icons: Call & Maps */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignSelf: 'center' }}>
                  <button
                    onClick={() => openGoogleMaps(stop.lat, stop.lng)}
                    className="icon-btn"
                    style={{
                      width: '38px',
                      height: '38px',
                      backgroundColor: 'var(--color-accent-delivery-bg)',
                      borderColor: '#fde68a',
                      color: 'var(--color-accent-delivery)'
                    }}
                    title="Launch Turn-by-Turn GPS Navigation"
                  >
                    <Navigation size={16} />
                  </button>
                  {stop.contact_phone && (
                    <a
                      href={`tel:${stop.contact_phone}`}
                      className="icon-btn"
                      style={{
                        width: '38px',
                        height: '38px',
                        backgroundColor: isPickup ? '#f0fdf4' : '#fef2f2',
                        borderColor: isPickup ? '#bbf7d0' : '#fecaca',
                        color: isPickup ? '#16a34a' : '#dc2626'
                      }}
                      title="Call Contact"
                    >
                      <Phone size={14} />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
