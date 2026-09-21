import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { getImageUrl } from '../utils/imageUtils';
import {
  Sprout,
  Search,
  Heart,
  ShoppingCart,
  Star,
  Plus,
  Minus,
  Trash2,
  X,
  LogOut,
  MapPin,
  CheckCircle2,
  Carrot,
  Apple,
  Wheat,
  Salad,
  Milk,
  Sparkles,
  Settings,
  ShoppingBag,
  User
} from 'lucide-react';

export const CustomerDashboard = () => {
  const { user, logout, updateProfile } = useAuth();
  const { cartItems, addToCart, updateQuantity, removeFromCart, totalItemsCount, cartTotalAmount, clearCart } = useCart();
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [orderPlacedSuccess, setOrderPlacedSuccess] = useState(false);

  // Profile, Settings & Orders Modals State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: '', email: '', phone: '', delivery_address: '', city: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [myOrders, setMyOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Wishlist State
  const [wishlistIds, setWishlistIds] = useState([]);
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [showWishlistDrawer, setShowWishlistDrawer] = useState(false);

  const loadWishlist = async () => {
    try {
      const data = await productService.getWishlist();
      setWishlistIds(data.product_ids || []);
      setWishlistProducts(data.products || []);
    } catch (err) {
      console.warn('Failed to load wishlist', err);
    }
  };

  const toggleWishlist = async (product) => {
    const exists = wishlistIds.includes(product.id);
    if (exists) {
      setWishlistIds(prev => prev.filter(id => id !== product.id));
      setWishlistProducts(prev => prev.filter(p => p.id !== product.id));
      await productService.removeFromWishlist(product.id);
    } else {
      setWishlistIds(prev => [...prev, product.id]);
      setWishlistProducts(prev => [...prev, product]);
      await productService.addToWishlist(product.id);
    }
  };

  const openProfileModal = () => {
    setProfileSuccess('');
    setProfileForm({
      full_name: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      delivery_address: user?.customer?.delivery_address || user?.delivery_address || '42 Green Valley Layout',
      city: user?.customer?.city || user?.city || 'Chennai'
    });
    setShowProfileModal(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      await updateProfile(profileForm);
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => setShowProfileModal(false), 1000);
    } catch (err) {
      alert('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [prods, cats] = await Promise.all([
          productService.getProducts(),
          productService.getCategories().catch(() => [
            { id: 1, name: 'All Harvest', icon: 'Sparkles' },
            { id: 2, name: 'Fresh Vegetables', icon: 'Carrot' },
            { id: 3, name: 'Organic Fruits', icon: 'Apple' },
            { id: 4, name: 'Grains & Millets', icon: 'Wheat' },
            { id: 5, name: 'Greens & Herbs', icon: 'Salad' },
            { id: 6, name: 'Farm Dairy', icon: 'Milk' }
          ])
        ]);
        setProducts(prods);
        setCategories(cats);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.farmer_name && p.farmer_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategory ? p.category_id === selectedCategory : true;
    return matchesSearch && matchesCat;
  });

  const loadMyOrders = async () => {
    try {
      setLoadingOrders(true);
      const orders = await orderService.getMyOrders();
      setMyOrders(orders || []);
    } catch (err) {
      console.warn('Failed to load orders', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const openOrdersModal = () => {
    setShowOrdersModal(true);
    loadMyOrders();
  };

  useEffect(() => {
    if (location.state?.openOrders) {
      openOrdersModal();
    }
  }, [location.state]);

  const handleProceedToCheckout = () => {
    setShowCartDrawer(false);
    navigate('/checkout');
  };

  const getCategoryIcon = (iconName) => {
    switch (iconName) {
      case 'Carrot': return <Carrot size={16} />;
      case 'Apple': return <Apple size={16} />;
      case 'Wheat': return <Wheat size={16} />;
      case 'Salad': return <Salad size={16} />;
      case 'Milk': return <Milk size={16} />;
      default: return <Sprout size={16} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-app)', display: 'flex', flexDirection: 'column' }}>
      {/* TOP BAR: Logo, prominent search bar (centerpiece), wishlist, cart badge, profile */}
      <header className="customer-topbar">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <Sprout size={28} color="var(--color-primary)" />
          <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-primary)' }}>Farm2Home</span>
        </div>

        {/* PROMINENT SEARCH BAR (Largest element in row) */}
        <div className="customer-search-box">
          <Search size={18} className="search-icon-pos" />
          <input
            type="text"
            className="search-input"
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ position: 'absolute', right: '14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Right Actions: Language, Wishlist, Cart with badge, Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <LanguageToggle />

          <button
            className="icon-btn"
            onClick={() => setShowWishlistDrawer(true)}
            title="Wishlist"
            style={{ position: 'relative', backgroundColor: wishlistIds.length > 0 ? '#fef2f2' : 'var(--color-bg-surface)' }}
          >
            <Heart size={18} fill={wishlistIds.length > 0 ? '#ef4444' : 'none'} color={wishlistIds.length > 0 ? '#ef4444' : 'inherit'} />
            {wishlistIds.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  width: '18px',
                  height: '18px',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {wishlistIds.length}
              </span>
            )}
          </button>

          {/* Cart Icon with Live Item Count Badge */}
          <button
            className="icon-btn"
            onClick={() => setShowCartDrawer(true)}
            title="Cart"
            style={{ backgroundColor: totalItemsCount > 0 ? 'var(--color-primary-light)' : 'var(--color-bg-surface)' }}
          >
            <ShoppingCart size={18} color={totalItemsCount > 0 ? 'var(--color-primary)' : 'inherit'} />
            {totalItemsCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  width: '20px',
                  height: '20px',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {totalItemsCount}
              </span>
            )}
          </button>

          {/* My Orders Button */}
          <button
            className="icon-btn"
            onClick={openOrdersModal}
            title="My Orders"
          >
            <ShoppingBag size={18} />
          </button>

          {/* Profile Avatar & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="avatar-circle">
              {user?.full_name ? user.full_name.charAt(0) : 'P'}
            </div>
            <button
              onClick={logout}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* HORIZONTALLY SCROLLABLE CATEGORY CHIPS */}
      <div className="category-scroll-bar">
        <button
          className={`category-chip ${selectedCategory === null ? 'active' : ''}`}
          onClick={() => setSelectedCategory(null)}
        >
          <Sparkles size={16} />
          <span>All Produce</span>
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`category-chip ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
          >
            {getCategoryIcon(cat.icon)}
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* PRODUCT GRID: Card with image, product name, FARMER NAME (trust factor), price, star rating, direct Add to Cart */}
      <main style={{ flex: 1 }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '24px 32px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {selectedCategory ? 'Filtered Harvests' : 'Today’s Harvest Fresh From Farms'}
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              100% direct farmer connection · Zero middlemen markups
            </p>
          </div>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Showing {filteredProducts.length} items
          </span>
        </div>

        <div className="customer-catalog-grid">
          {filteredProducts.map((product) => {
            const inCart = cartItems.find((item) => item.id === product.id);

            return (
              <div key={product.id} className="product-market-card">
                {/* Image + Farmer Badge Overlay */}
                <div className="product-card-img-wrapper" style={{ position: 'relative' }}>
                  <img
                    src={getImageUrl(product.image_url)}
                    alt={product.name}
                    className="product-card-img"
                  />
                  {/* Farmer Name (The Trust / Transparency Differentiator - Section 3) */}
                  <div className="farmer-badge-pill">
                    🌱 {product.farmer_name || 'Verified Delta Farmer'}
                  </div>
                  <button
                    onClick={() => toggleWishlist(product)}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: 'rgba(255, 255, 255, 0.92)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                      zIndex: 2
                    }}
                    title={wishlistIds.includes(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                  >
                    <Heart size={16} fill={wishlistIds.includes(product.id) ? '#ef4444' : 'none'} color={wishlistIds.includes(product.id) ? '#ef4444' : '#64748b'} />
                  </button>
                </div>

                {/* Body: Title, Location, Rating */}
                <div className="product-card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                    <h2 className="product-title">{product.name}</h2>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.8125rem', fontWeight: 600, color: '#d97706' }}>
                      <Star size={14} fill="#d97706" />
                      <span>{product.rating}</span>
                    </div>
                  </div>

                  <div className="product-farmer-name">
                    <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>Harvested in:</span> {product.farmer_location || 'Tamil Nadu'}
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {product.description}
                  </div>
                </div>

                {/* Footer: Price + Direct Add to Cart */}
                <div className="product-card-footer">
                  <div>
                    <span style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                      ₹{product.price_per_unit}
                    </span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                      {' '}/ {product.unit}
                    </span>
                  </div>

                  {inCart ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--color-primary-light)', border: '1px solid var(--color-primary-border)', borderRadius: 'var(--radius-sm)', padding: '3px 6px' }}>
                      <button
                        onClick={() => updateQuantity(product.id, inCart.quantity - 1)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)' }}
                      >
                        <Minus size={14} />
                      </button>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary)', minWidth: '16px', textAlign: 'center' }}>
                        {inCart.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(product.id, inCart.quantity + 1)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)' }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => addToCart(product)}
                    >
                      <Plus size={14} />
                      <span>{t('addToCart')}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* SHOPPING CART SLIDE-OVER DRAWER */}
      {showCartDrawer && (
        <div className="modal-overlay" onClick={() => setShowCartDrawer(false)}>
          <div
            className="modal-card"
            style={{ position: 'fixed', right: 0, top: 0, bottom: 0, maxWidth: '420px', borderRadius: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: 'var(--border-hairline)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingCart size={20} color="var(--color-primary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Your Farm Basket ({totalItemsCount})</h3>
              </div>
              <button
                onClick={() => setShowCartDrawer(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {orderPlacedSuccess ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '16px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={36} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Order Placed Successfully!</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                  A nearby delivery partner is being assigned for direct farm harvest pickup.
                </p>
              </div>
            ) : cartItems.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '12px' }}>
                <ShoppingCart size={40} color="var(--color-text-light)" />
                <p style={{ color: 'var(--color-text-muted)' }}>Your basket is currently empty.</p>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowCartDrawer(false)}
                >
                  Start browsing produce
                </button>
              </div>
            ) : (
              <>
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {cartItems.map((item) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: 'var(--color-bg-app)', borderRadius: 'var(--radius-md)', border: 'var(--border-hairline)' }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          ₹{item.price_per_unit} / {item.unit} · Farmer: {item.farmer_name || 'Verified Farmer'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-bg-surface)', border: 'var(--border-hairline)', borderRadius: 'var(--radius-sm)', padding: '2px 6px' }}>
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>-</button>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>+</button>
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '0.9375rem', minWidth: '50px', textAlign: 'right' }}>
                          ₹{item.price_per_unit * item.quantity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: 'var(--border-hairline)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="flex-between" style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    <span>Produce subtotal</span>
                    <span>₹{cartTotalAmount}</span>
                  </div>
                  <div className="flex-between" style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    <span>Direct farm delivery fee</span>
                    <span>₹30</span>
                  </div>
                  <div className="hairline-divider" style={{ margin: '4px 0' }} />
                  <div className="flex-between" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    <span>Total Amount</span>
                    <span style={{ color: 'var(--color-primary)' }}>₹{cartTotalAmount + 30}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    <button
                      className="btn btn-primary btn-lg"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={handleProceedToCheckout}
                    >
                      Proceed to Checkout (₹{cartTotalAmount + 30})
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => {
                        setShowCartDrawer(false);
                        navigate('/cart');
                      }}
                    >
                      View Full Basket Page
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* CUSTOMER PROFILE EDIT MODAL */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Edit Customer Profile</h3>
              <button onClick={() => setShowProfileModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {profileSuccess && (
              <div style={{ padding: '8px 12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-sm)', color: '#15803d', fontSize: '0.875rem', marginBottom: '14px' }}>
                {profileSuccess}
              </div>
            )}

            <form onSubmit={handleSaveProfile}>
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
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  placeholder="customer@example.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-input"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="9876543210"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Delivery Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={profileForm.delivery_address}
                  onChange={(e) => setProfileForm({ ...profileForm, delivery_address: e.target.value })}
                  placeholder="e.g. 42 Green Valley Layout"
                />
              </div>

              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  type="text"
                  className="form-input"
                  value={profileForm.city}
                  onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                  placeholder="e.g. Chennai"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowProfileModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Customer Settings</h3>
              <button onClick={() => setShowSettingsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ marginBottom: '8px' }}>Interface Language</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[
                  { code: 'en', label: 'English' },
                  { code: 'ta', label: 'தமிழ்' },
                  { code: 'hi', label: 'हिन्दी' }
                ].map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setLang(item.code)}
                    className={`btn btn-sm ${lang === item.code ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ justifyContent: 'center' }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="hairline-divider" />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>Edit Profile</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                  Update your contact details and address
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setShowSettingsModal(false);
                  openProfileModal();
                }}
              >
                Profile Editor
              </button>
            </div>

            <div className="hairline-divider" />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" className="btn btn-primary" onClick={() => setShowSettingsModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORDERS HISTORY MODAL */}
      {showOrdersModal && (
        <div className="modal-overlay" onClick={() => setShowOrdersModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={20} color="var(--color-primary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>My Orders</h3>
              </div>
              <button onClick={() => setShowOrdersModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
              {loadingOrders ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                  Loading your orders...
                </div>
              ) : myOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                  <ShoppingBag size={36} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                  <p>No orders placed yet.</p>
                </div>
              ) : (
                <table className="table-clean" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myOrders.map((ord) => (
                      <tr key={ord.id}>
                        <td style={{ fontWeight: 600 }}>{ord.order_number}</td>
                        <td style={{ fontSize: '0.8125rem' }}>
                          {ord.items?.map(i => `${i.name} (${i.quantity}${i.unit})`).join(', ') || 'Produce'}
                        </td>
                        <td style={{ fontWeight: 600 }}>₹{ord.total_amount}</td>
                        <td>
                          <span className={`badge ${ord.status === 'delivered' ? 'badge-success' : ord.status === 'confirmed' ? 'badge-primary' : 'badge-warning'}`}>
                            {ord.status}
                          </span>
                          {ord.delivery_agent ? (
                            <div style={{ fontSize: '0.72rem', color: 'var(--color-primary)', marginTop: '3px', fontWeight: 500 }}>
                              🛵 {ord.delivery_agent.name}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.72rem', color: '#ea580c', marginTop: '3px' }}>
                              ⏳ Finding partner…
                            </div>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            onClick={() => {
                              setShowOrdersModal(false);
                              navigate(`/order-confirmation/${ord.id}`);
                            }}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowOrdersModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WISHLIST SLIDE-OVER DRAWER */}
      {showWishlistDrawer && (
        <div className="modal-overlay" onClick={() => setShowWishlistDrawer(false)}>
          <div
            className="modal-card"
            style={{ position: 'fixed', right: 0, top: 0, bottom: 0, maxWidth: '420px', borderRadius: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: 'var(--border-hairline)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Heart size={20} color="#ef4444" fill="#ef4444" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Saved Produce ({wishlistProducts.length})</h3>
              </div>
              <button
                onClick={() => setShowWishlistDrawer(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {wishlistProducts.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '12px' }}>
                <Heart size={40} color="var(--color-text-light)" />
                <p style={{ color: 'var(--color-text-muted)' }}>No items in your wishlist yet.</p>
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {wishlistProducts.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: 'var(--color-bg-app)', borderRadius: 'var(--radius-md)', border: 'var(--border-hairline)' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        ₹{item.price_per_unit} / {item.unit}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          addToCart(item);
                          toggleWishlist(item);
                        }}
                      >
                        <Plus size={13} />
                        <span>Move to Cart</span>
                      </button>
                      <button
                        onClick={() => toggleWishlist(item)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                        title="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
