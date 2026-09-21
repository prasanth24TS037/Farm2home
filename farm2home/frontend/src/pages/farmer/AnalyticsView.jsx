import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { analyticsService } from '../../services/analyticsService';
import { getImageUrl } from '../../utils/imageUtils';
import {
  TrendingUp,
  IndianRupee,
  ShoppingBag,
  Package,
  Scale,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  PieChart as PieIcon,
  BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

export const AnalyticsView = () => {
  const { t } = useLanguage();
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async (selectedRange = range) => {
    try {
      setLoading(true);
      setError('');
      const res = await analyticsService.getFarmerAnalytics(selectedRange);
      setData(res);
    } catch (err) {
      console.error('Failed to load farmer analytics:', err);
      setError('Unable to load analytics data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(range);
  }, [range]);

  const summary = data?.summary || {
    total_revenue: 0,
    total_orders: 0,
    total_units_sold: 0,
    average_order_value: 0,
    growth_percentage: 0
  };

  const trend = data?.revenue_trend || [];
  const topProducts = data?.top_products || [];
  const categorySplit = data?.category_split || [];
  const inventoryHealth = data?.inventory_health || { in_stock: 0, low_stock: 0, out_of_stock: 0, total_products: 0 };

  const hasSales = summary.total_revenue > 0 || summary.total_orders > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Row with Range Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
            {t('analyticsTitle')}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {data?.farm_info?.farm_name ? `${data.farm_info.farm_name} · ` : ''}{t('analyticsSubtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Time range toggle */}
          <div style={{
            display: 'inline-flex',
            backgroundColor: 'var(--color-bg-surface)',
            border: 'var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px'
          }}>
            {[
              { id: '7d', label: t('days7') },
              { id: '30d', label: t('days30') },
              { id: '6m', label: t('months6') }
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setRange(btn.id)}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.8125rem',
                  fontWeight: range === btn.id ? 600 : 400,
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: range === btn.id ? 'var(--color-primary)' : 'transparent',
                  color: range === btn.id ? '#ffffff' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fetchAnalytics(range)}
            disabled={loading}
            title="Refresh analytics"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-sm)',
          color: '#b91c1c',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      {/* Top 4 Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="stat-card-clean">
          <div className="stat-card-title">
            <IndianRupee size={16} color="var(--color-success)" />
            <span>{t('totalRevenue')}</span>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--color-primary)' }}>
            ₹{loading ? '...' : summary.total_revenue.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {summary.growth_percentage > 0 ? `+${summary.growth_percentage}% direct farm growth` : 'Real-time sales'}
          </div>
        </div>

        <div className="stat-card-clean">
          <div className="stat-card-title">
            <ShoppingBag size={16} color="var(--color-accent-customer)" />
            <span>{t('totalOrders')}</span>
          </div>
          <div className="stat-card-value">
            {loading ? '...' : summary.total_orders}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Fulfilled & confirmed orders
          </div>
        </div>

        <div className="stat-card-clean">
          <div className="stat-card-title">
            <Scale size={16} color="#8b5cf6" />
            <span>{t('unitsSold')}</span>
          </div>
          <div className="stat-card-value">
            {loading ? '...' : `${summary.total_units_sold} units`}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Produce harvest dispatched
          </div>
        </div>

        <div className="stat-card-clean">
          <div className="stat-card-title">
            <TrendingUp size={16} color="var(--color-warning)" />
            <span>{t('avgOrderValue')}</span>
          </div>
          <div className="stat-card-value">
            ₹{loading ? '...' : summary.average_order_value.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Per completed customer cart
          </div>
        </div>
      </div>

      {/* Revenue Trend Chart Section */}
      <div className="product-table-wrapper" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} color="var(--color-primary)" />
              <span>{t('revenueTrend')}</span>
            </h3>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              Direct farmer income over time
            </span>
          </div>

          <span className="badge badge-success">
            <TrendingUp size={12} />
            <span>Active Harvest Season</span>
          </span>
        </div>

        {loading ? (
          <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
            Loading trend chart...
          </div>
        ) : !hasSales ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <TrendingUp size={24} color="var(--color-text-muted)" />
            </div>
            <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '6px' }}>{t('noSalesYet')}</div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', maxWidth: '440px', margin: '0 auto' }}>
              When customers purchase your fresh produce, your revenue trends, top-selling items, and category analytics will automatically populate here.
            </p>
          </div>
        ) : (
          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="farmGreenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#15803d" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#15803d" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div style={{
                          backgroundColor: '#ffffff',
                          border: 'var(--border-hairline)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '10px 14px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                        }}>
                          <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#0f172a', marginBottom: '4px' }}>
                            {label}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#15803d', fontWeight: 600 }}>
                            Revenue: ₹{d.revenue.toLocaleString()}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Orders: {d.orders}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#15803d"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#farmGreenGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Grid Row: Top-Selling Produce + Category & Inventory Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* Top-Selling Produce */}
        <div className="product-table-wrapper" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={18} color="var(--color-primary)" />
            <span>{t('topProducts')}</span>
          </h3>

          {topProducts.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              No produce sales recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {topProducts.map((prod, idx) => (
                <div
                  key={prod.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    backgroundColor: 'var(--color-bg-app)',
                    borderRadius: 'var(--radius-sm)',
                    border: 'var(--border-hairline)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: idx === 0 ? 'var(--color-primary)' : 'var(--color-bg-subtle)',
                      color: idx === 0 ? '#ffffff' : 'var(--color-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {idx + 1}
                    </div>

                    <img
                      src={getImageUrl(prod.image_url)}
                      alt={prod.name}
                      style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80';
                      }}
                    />

                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--color-text-main)' }}>
                        {prod.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        ₹{prod.price}/{prod.unit} · {prod.units_sold} {prod.unit} sold
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-primary)' }}>
                      ₹{prod.revenue.toLocaleString()}
                    </div>
                    <span className={`badge ${prod.stock_quantity > 5 ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                      {prod.stock_quantity > 5 ? 'In Stock' : 'Low Stock'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category Breakdown & Inventory Health */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Category Breakdown */}
          <div className="product-table-wrapper" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieIcon size={18} color="var(--color-primary)" />
              <span>{t('categorySplit')}</span>
            </h3>

            {categorySplit.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                No category data available.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {categorySplit.map((cat, idx) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 500 }}>{cat.category}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>
                        {cat.revenue > 0 ? `₹${cat.revenue.toLocaleString()} (${cat.percentage}%)` : `${cat.percentage}% of catalog`}
                      </span>
                    </div>
                    <div style={{
                      height: '8px',
                      backgroundColor: 'var(--color-bg-subtle)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(5, cat.percentage))}%`,
                        backgroundColor: idx === 0 ? '#15803d' : idx === 1 ? '#0284c7' : idx === 2 ? '#d97706' : '#8b5cf6',
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inventory Health Summary */}
          <div className="product-table-wrapper" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="#16a34a" />
              <span>{t('inventoryHealth')}</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div style={{
                padding: '12px',
                backgroundColor: 'var(--color-success-bg)',
                border: '1px solid var(--color-primary-border)',
                borderRadius: 'var(--radius-sm)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-success)' }}>
                  {inventoryHealth.in_stock}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 500 }}>
                  {t('inStock')}
                </div>
              </div>

              <div style={{
                padding: '12px',
                backgroundColor: 'var(--color-warning-bg)',
                border: '1px solid #fde68a',
                borderRadius: 'var(--radius-sm)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-warning)' }}>
                  {inventoryHealth.low_stock}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-warning)', fontWeight: 500 }}>
                  {t('lowStock')}
                </div>
              </div>

              <div style={{
                padding: '12px',
                backgroundColor: 'var(--color-danger-bg)',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-sm)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-danger)' }}>
                  {inventoryHealth.out_of_stock}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', fontWeight: 500 }}>
                  {t('outOfStock')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
