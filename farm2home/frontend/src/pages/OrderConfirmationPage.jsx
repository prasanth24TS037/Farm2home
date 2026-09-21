import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { orderService } from '../services/orderService';
import { CheckoutSteps } from '../components/checkout/CheckoutSteps';
import { getImageUrl } from '../utils/imageUtils';
import {
  CheckCircle2,
  AlertCircle,
  Truck,
  MapPin,
  Clock,
  Calendar,
  CreditCard,
  ShoppingBag,
  ArrowRight,
  Leaf,
  Home,
  RefreshCw
} from 'lucide-react';

export const OrderConfirmationPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const data = await orderService.getOrder(orderId);
        setOrder(data);
      } catch (err) {
        console.error('Failed to load order details:', err);
        setError(err.response?.data?.detail || 'Could not locate order details.');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <RefreshCw size={36} color="var(--color-primary)" className="spin" />
        <p style={{ color: 'var(--color-text-muted)' }}>Retrieving your order confirmation...</p>
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .spin { animation: spin 1s linear infinite; }
        `}</style>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="card-flat" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '36px 24px' }}>
          <AlertCircle size={48} color="var(--color-danger)" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Order Not Found</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '8px' }}>
            {error || 'The requested order could not be retrieved or you do not have permission to view it.'}
          </p>
          <button
            onClick={() => navigate('/dashboard/customer')}
            className="btn btn-primary"
            style={{ marginTop: '20px' }}
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const isFailed = order.status === 'failed' || order.payment_status === 'failed';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-app)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header style={{
        height: '64px',
        backgroundColor: 'var(--color-bg-surface)',
        borderBottom: 'var(--border-hairline)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Leaf size={20} color="var(--color-primary)" />
          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-primary)' }}>Farm2Home</span>
        </div>

        <button
          onClick={() => navigate('/dashboard/customer')}
          className="btn btn-secondary btn-sm"
          style={{ gap: '6px' }}
        >
          <Home size={15} />
          <span>Marketplace</span>
        </button>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: '860px', width: '100%', margin: '0 auto', padding: '24px 16px' }}>
        <CheckoutSteps currentStep={4} />

        {isFailed ? (
          /* Payment Failure State */
          <div className="card-flat" style={{ textAlign: 'center', padding: '40px 24px', marginBottom: '24px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <AlertCircle size={36} />
            </div>

            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-danger)' }}>
              Payment Unsuccessful
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem', marginTop: '6px', maxWidth: '460px', margin: '6px auto 0 auto' }}>
              Your order #{order.order_number} was created, but the payment transaction was declined by the bank or gateway.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
              <button
                onClick={() => navigate('/payment', { state: { orderId: order.id } })}
                className="btn btn-primary btn-lg"
              >
                Retry Payment
              </button>
              <button
                onClick={() => navigate('/dashboard/customer')}
                className="btn btn-secondary btn-lg"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        ) : (
          /* Success State */
          <>
            <div className="card-flat" style={{
              textAlign: 'center',
              padding: '36px 24px',
              marginBottom: '24px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0'
            }}>
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-success)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                boxShadow: '0 4px 14px rgba(22, 101, 52, 0.2)'
              }}>
                <CheckCircle2 size={40} />
              </div>

              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#166534' }}>
                Farm Harvest Order Confirmed!
              </h1>
              <p style={{ fontSize: '1rem', color: '#15803d', marginTop: '4px' }}>
                Thank you, <strong>{order.customer?.name || 'Valued Customer'}</strong>. Your direct farm order has been dispatched to local growers.
              </p>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: '#ffffff',
                border: '1px solid #86efac',
                borderRadius: 'var(--radius-full)',
                padding: '6px 20px',
                marginTop: '16px',
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: '#166534'
              }}>
                <span>Order Reference: {order.order_number}</span>
                <span>•</span>
                <span>Status: Confirmed</span>
              </div>
            </div>

            {/* Order Overview Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div className="card-flat" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Clock size={20} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Estimated Delivery</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginTop: '2px' }}>
                    {order.delivery_slot || 'Today, Evening Slot'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Direct farm harvest courier
                  </div>
                </div>
              </div>

              <div className="card-flat" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <CreditCard size={20} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Payment Info</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginTop: '2px' }}>
                    ₹{order.total_amount} via {order.payment_method}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: order.payment_status === 'completed' ? 'var(--color-success)' : 'var(--color-warning)', marginTop: '2px', fontWeight: 500 }}>
                    Payment: {order.payment_status?.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="card-flat" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <MapPin size={20} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Delivery Address</div>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem', marginTop: '2px', color: 'var(--color-text-main)' }}>
                    {order.delivery_address}
                  </div>
                </div>
              </div>
            </div>

            {/* Real Delivery Partner & Multi-Leg Dispatch Section */}
            <div className="card-flat" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 'var(--border-hairline)', paddingBottom: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Truck size={20} color="var(--color-primary)" />
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Farm-to-Door Delivery Dispatch</h2>
                </div>
                <span className="badge badge-success">
                  {order.deliveries && order.deliveries.length > 1
                    ? `${order.deliveries.filter(d => d.status === 'delivered').length} of ${order.deliveries.length} Delivered`
                    : (order.deliveries?.[0]?.status || order.status || 'Dispatched').toUpperCase()}
                </span>
              </div>

              {(!order.deliveries || order.deliveries.length === 0) ? (
                <div style={{ padding: '16px', backgroundColor: 'var(--color-bg-app)', borderRadius: 'var(--radius-sm)', border: 'var(--border-hairline)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Clock size={20} color="var(--color-warning)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Finding a delivery partner…</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                      Connecting your order with an on-duty local courier.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {order.deliveries.map((leg, idx) => (
                    <div
                      key={leg.id || idx}
                      style={{
                        padding: '14px',
                        backgroundColor: 'var(--color-bg-app)',
                        borderRadius: 'var(--radius-sm)',
                        border: 'var(--border-hairline)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                            Pickup Leg {idx + 1}: {leg.farmer_name}
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            📍 {leg.pickup_address}
                          </div>
                        </div>
                        <span className={`badge ${
                          leg.status === 'delivered' ? 'badge-success' :
                          leg.status === 'out_for_delivery' || leg.status === 'picked_up' ? 'badge-primary' :
                          leg.status === 'assigned' || leg.status === 'accepted' ? 'badge-neutral' :
                          'badge-warning'
                        }`} style={{ textTransform: 'capitalize' }}>
                          {leg.status ? leg.status.replace('_', ' ') : 'Pending'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: 'var(--border-hairline)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: leg.delivery_agent ? '#e0f2fe' : '#fff7ed',
                            color: leg.delivery_agent ? '#0284c7' : '#ea580c',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Truck size={18} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                              {leg.delivery_agent ? leg.delivery_agent.name : 'Finding a delivery partner…'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                              {leg.delivery_agent
                                ? `${leg.delivery_agent.vehicle_type || 'EV Courier'} (${leg.delivery_agent.vehicle_number || 'Verified'})`
                                : 'Searching for nearest on-duty partner'}
                            </div>
                          </div>
                        </div>

                        {leg.delivery_agent && leg.delivery_agent.phone && (
                          <a
                            href={`tel:${leg.delivery_agent.phone}`}
                            className="btn btn-secondary btn-sm"
                            style={{ gap: '6px' }}
                          >
                            <span>Call Partner</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Itemized Order Table */}
            <div className="card-flat" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 'var(--border-hairline)', paddingBottom: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag size={20} color="var(--color-primary)" />
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Itemized Farm Produce</h2>
                </div>
                <span className="badge badge-neutral">
                  {order.items?.length || 0} Products
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      backgroundColor: 'var(--color-bg-app)',
                      borderRadius: 'var(--radius-sm)',
                      border: 'var(--border-hairline)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={getImageUrl(item.image_url)}
                        alt={item.name}
                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px' }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=120&auto=format&fit=crop&q=80';
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-text-main)' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                          ₹{item.unit_price} / {item.unit} · Qty: {item.quantity} {item.unit}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 500, marginTop: '2px' }}>
                          🌾 Harvested by: {item.farmer_name}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-main)' }}>
                      ₹{item.subtotal}
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Cost Breakdown */}
              <div style={{ borderTop: 'var(--border-hairline)', marginTop: '20px', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="flex-between" style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                  <span>Produce Subtotal</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>₹{order.subtotal}</span>
                </div>
                <div className="flex-between" style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                  <span>Direct Farm Delivery Fee</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>₹{order.delivery_fee}</span>
                </div>
                <div className="hairline-divider" style={{ margin: '4px 0' }} />
                <div className="flex-between" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  <span>Total Paid</span>
                  <span style={{ color: 'var(--color-primary)' }}>₹{order.total_amount}</span>
                </div>
              </div>
            </div>

            {/* Next Steps CTA */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'center' }}>
              <button
                onClick={() => navigate('/dashboard/customer')}
                className="btn btn-primary btn-lg"
                style={{ gap: '8px' }}
              >
                <Leaf size={18} />
                <span>Continue Shopping</span>
              </button>

              <button
                onClick={() => navigate('/dashboard/customer', { state: { openOrders: true } })}
                className="btn btn-secondary btn-lg"
                style={{ gap: '8px' }}
              >
                <Truck size={18} />
                <span>Track Order in My Orders</span>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
