import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { CheckoutSteps } from '../components/checkout/CheckoutSteps';
import { getImageUrl } from '../utils/imageUtils';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Truck,
  Leaf
} from 'lucide-react';

export const CartPage = () => {
  const navigate = useNavigate();
  const { cartItems, updateQuantity, removeFromCart, clearCart, totalItemsCount, cartTotalAmount, deliveryFee, grandTotal } = useCart();
  const { user } = useAuth();
  const { t } = useLanguage();

  // Group cart items by real owning farmer
  const groupedByFarmer = cartItems.reduce((acc, item) => {
    const fName = item.farmer_name || 'Direct Farm Harvest';
    if (!acc[fName]) {
      acc[fName] = {
        farmerName: fName,
        farmLocation: item.farmer_location,
        items: [],
        subtotal: 0
      };
    }
    acc[fName].items.push(item);
    acc[fName].subtotal += (parseFloat(item.price_per_unit) || 0) * (parseFloat(item.quantity) || 1);
    return acc;
  }, {});

  const farmerGroups = Object.values(groupedByFarmer);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-app)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/dashboard/customer')}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 10px' }}
          >
            <ArrowLeft size={16} />
            <span>Marketplace</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Leaf size={20} color="var(--color-primary)" />
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-primary)' }}>Farm2Home</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Welcome, <strong>{user?.full_name || 'Customer'}</strong>
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: '1080px', width: '100%', margin: '0 auto', padding: '24px 16px' }}>
        <CheckoutSteps currentStep={1} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
              Your Harvest Basket
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Fresh produce directly reserved from local family farms
            </p>
          </div>

          {cartItems.length > 0 && (
            <button
              onClick={clearCart}
              className="btn btn-secondary btn-sm"
              style={{ color: 'var(--color-danger)', borderColor: '#fecaca' }}
            >
              <Trash2 size={14} />
              <span>Empty Basket</span>
            </button>
          )}
        </div>

        {cartItems.length === 0 ? (
          /* Empty Cart State */
          <div className="card-flat" style={{
            textAlign: 'center',
            padding: '60px 20px',
            maxWidth: '520px',
            margin: '40px auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-muted)'
            }}>
              <ShoppingCart size={36} />
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Your basket is empty</h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-muted)', maxWidth: '360px' }}>
              Explore seasonal farm vegetables, organic fruits, stone-ground flours, and fresh farm dairy.
            </p>

            <button
              onClick={() => navigate('/dashboard/customer')}
              className="btn btn-primary btn-lg"
              style={{ marginTop: '8px' }}
            >
              <Leaf size={18} />
              <span>Browse Fresh Products</span>
            </button>
          </div>
        ) : (
          /* Active Cart Grid */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.8fr) minmax(300px, 1fr)',
            gap: '24px',
            alignItems: 'start'
          }}>
            {/* Left: Items List Grouped by Farmer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {farmerGroups.map((group) => (
                <div key={group.farmerName} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 14px',
                    backgroundColor: 'var(--color-bg-surface)',
                    border: 'var(--border-hairline)',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: '4px solid var(--color-primary)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Leaf size={16} color="var(--color-primary)" />
                      <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-text-main)' }}>
                        From {group.farmerName}
                      </span>
                      {group.farmLocation && (
                        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                          ({group.farmLocation})
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                      {group.items.length} {group.items.length === 1 ? 'item' : 'items'} · ₹{Math.round(group.subtotal)}
                    </span>
                  </div>

                  {group.items.map((item) => {
                const itemId = item.product_id || item.id;
                const lineTotal = Math.round((parseFloat(item.price_per_unit) || 0) * (parseFloat(item.quantity) || 1));

                return (
                  <div
                    key={itemId}
                    className="card-flat"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '16px',
                      transition: 'border-color 0.15s ease'
                    }}
                  >
                    {/* Thumbnail */}
                    <img
                      src={getImageUrl(item.image_url)}
                      alt={item.name}
                      style={{
                        width: '74px',
                        height: '74px',
                        objectFit: 'cover',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--color-bg-subtle)'
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200&auto=format&fit=crop&q=80';
                      }}
                    />

                    {/* Product & Farmer Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>
                        {item.name}
                      </h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                        <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                          ₹{item.price_per_unit} / {item.unit || 'kg'}
                        </span>
                        <span>•</span>
                        <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>
                          🌾 {item.farmer_name || 'Direct Farm Harvest'}
                        </span>
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: 'var(--color-bg-app)',
                      border: 'var(--border-hairline)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '4px 8px'
                    }}>
                      <button
                        onClick={() => updateQuantity(itemId, item.quantity - 1)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '2px',
                          color: 'var(--color-text-muted)'
                        }}
                        title="Decrease quantity"
                      >
                        <Minus size={15} />
                      </button>

                      <span style={{ minWidth: '22px', textAlign: 'center', fontWeight: 600, fontSize: '0.9375rem' }}>
                        {item.quantity}
                      </span>

                      <button
                        onClick={() => updateQuantity(itemId, item.quantity + 1)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '2px',
                          color: 'var(--color-primary)'
                        }}
                        title="Increase quantity"
                      >
                        <Plus size={15} />
                      </button>
                    </div>

                    {/* Line Total */}
                    <div style={{ minWidth: '70px', textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-main)' }}>
                        ₹{lineTotal}
                      </div>
                    </div>

                    {/* Trash Button */}
                    <button
                      onClick={() => removeFromCart(itemId)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '6px',
                        color: 'var(--color-text-muted)',
                        borderRadius: 'var(--radius-sm)',
                        transition: 'color 0.15s'
                      }}
                      title="Remove product"
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                );
              })}
                </div>
              ))}

              <div style={{ marginTop: '8px' }}>
                <button
                  onClick={() => navigate('/dashboard/customer')}
                  className="btn btn-secondary"
                  style={{ gap: '6px', fontSize: '0.875rem' }}
                >
                  <Plus size={15} />
                  <span>Add more farm produce</span>
                </button>
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="card-flat" style={{ position: 'sticky', top: '88px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, borderBottom: 'var(--border-hairline)', paddingBottom: '12px' }}>
                Order Summary ({totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'})
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="flex-between" style={{ fontSize: '0.9375rem', color: 'var(--color-text-muted)' }}>
                  <span>Farm produce subtotal</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>₹{cartTotalAmount}</span>
                </div>

                <div className="flex-between" style={{ fontSize: '0.9375rem', color: 'var(--color-text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Truck size={15} />
                    <span>Direct farm delivery</span>
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>₹{deliveryFee}</span>
                </div>

                <div className="hairline-divider" style={{ margin: '6px 0' }} />

                <div className="flex-between" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  <span>Grand Total</span>
                  <span style={{ color: 'var(--color-primary)' }}>₹{grandTotal}</span>
                </div>
              </div>

              <div style={{
                backgroundColor: 'var(--color-primary-light)',
                border: '1px solid var(--color-primary-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8125rem',
                color: 'var(--color-primary)'
              }}>
                <ShieldCheck size={18} style={{ flexShrink: 0 }} />
                <span>Zero middlemen fees. 100% of produce price goes directly to your farmer.</span>
              </div>

              <button
                onClick={() => navigate('/checkout')}
                className="btn btn-primary btn-lg"
                style={{ width: '100%', gap: '8px', justifyContent: 'center' }}
              >
                <span>Proceed to checkout</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
