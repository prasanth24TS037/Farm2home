import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { productService } from '../services/productService';
import { paymentService } from '../services/paymentService';
import { getImageUrl } from '../utils/imageUtils';
import { LanguageToggle } from '../components/common/LanguageToggle';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  ShoppingBag,
  TrendingUp,
  Bot,
  Settings,
  Bell,
  LogOut,
  IndianRupee,
  AlertTriangle,
  Clock,
  Sparkles,
  Edit2,
  Check,
  X,
  RefreshCw,
  Camera,
  Wallet
} from 'lucide-react';
import { AnalyticsView } from './farmer/AnalyticsView';
import { AIAssistantView } from './farmer/AIAssistantView';
import { EarningsView } from './farmer/EarningsView';

export const FarmerDashboard = () => {
  const { user, logout, updateProfile } = useAuth();
  const { lang, setLang, t } = useLanguage();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    monthly_earnings: 0,
    active_orders: 0,
    low_stock_count: 0
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick Price Edit Modal / Inline State
  const [editingProduct, setEditingProduct] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);

  // Quick Stock Edit Modal
  const [stockEditingProduct, setStockEditingProduct] = useState(null);
  const [newStock, setNewStock] = useState('');

  // Add Product Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    price_per_unit: '',
    unit: 'kg',
    stock_quantity: '',
    description: '',
    image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80'
  });

  // Profile Editor Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    farm_name: '',
    location: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState({ error: '', success: '' });

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Orders Modal State
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Notification Bell State
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Welcome to your farm management console', time: 'Just now', type: 'order' }
  ]);

  const [dismissedAiHints, setDismissedAiHints] = useState({});

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, prodsData, notifsData] = await Promise.all([
        productService.getFarmerStats().catch(() => ({ monthly_earnings: 0, active_orders: 0, low_stock_count: 0 })),
        productService.getMyProducts()
          .catch(() => productService.getProducts())
          .catch(() => []),
        paymentService.getNotifications().catch(() => [])
      ]);
      setStats(statsData || { monthly_earnings: 0, active_orders: 0, low_stock_count: 0 });
      setProducts(Array.isArray(prodsData) ? prodsData : []);
      if (Array.isArray(notifsData) && notifsData.length > 0) {
        setNotifications(notifsData.map(n => ({
          id: n.id,
          text: `${n.title}: ${n.message}`,
          time: n.created_at || 'Recently',
          type: n.type || 'order'
        })));
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openProfileModal = () => {
    setProfileStatus({ error: '', success: '' });
    setProfileForm({
      full_name: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      farm_name: user?.farmer?.farm_name || user?.farm_name || `${user?.full_name || 'Farmer'}'s Organic Farm`,
      location: user?.farmer?.location || user?.location || 'Thanjavur, Tamil Nadu'
    });
    setShowProfileModal(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileStatus({ error: '', success: '' });
    try {
      setSavingProfile(true);
      await updateProfile({
        full_name: profileForm.full_name,
        email: profileForm.email || undefined,
        phone: profileForm.phone || undefined,
        farm_name: profileForm.farm_name || undefined,
        location: profileForm.location || undefined
      });
      setProfileStatus({ error: '', success: 'Profile updated successfully!' });
      setTimeout(() => {
        setShowProfileModal(false);
      }, 1000);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update profile. Please try again.';
      setProfileStatus({ error: msg, success: '' });
    } finally {
      setSavingProfile(false);
    }
  };

  const openOrdersModal = async () => {
    setShowOrdersModal(true);
    setLoadingOrders(true);
    try {
      const data = await productService.getFarmerOrders();
      setOrders(data || []);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSavePrice = async (e) => {
    e.preventDefault();
    if (!editingProduct || !newPrice) return;
    try {
      setSavingPrice(true);
      await productService.quickUpdatePrice(editingProduct.id, newPrice);
      setProducts(prev =>
        prev.map(p => (p.id === editingProduct.id ? { ...p, price_per_unit: parseFloat(newPrice) } : p))
      );
      setEditingProduct(null);
    } catch (err) {
      alert('Failed to update price');
    } finally {
      setSavingPrice(false);
    }
  };

  const handleSaveStock = async (e) => {
    e.preventDefault();
    if (!stockEditingProduct || !newStock) return;
    try {
      await productService.quickUpdateStock(stockEditingProduct.id, newStock);
      setProducts(prev =>
        prev.map(p => (p.id === stockEditingProduct.id ? { ...p, stock_quantity: parseFloat(newStock) } : p))
      );
      setStockEditingProduct(null);
    } catch (err) {
      alert('Failed to update stock');
    }
  };

  // Quick Image Edit Modal State
  const [imageEditingProduct, setImageEditingProduct] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileError, setFileError] = useState('');
  const [savingImage, setSavingImage] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setFileError('');
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl('');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setFileError('Invalid image format. Allowed formats: JPEG, PNG, WebP.');
      setSelectedFile(null);
      setPreviewUrl('');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFileError('File size exceeds 5MB limit. Please select a smaller photo.');
      setSelectedFile(null);
      setPreviewUrl('');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSaveImage = async (e) => {
    e.preventDefault();
    if (!imageEditingProduct || !selectedFile) return;

    try {
      setSavingImage(true);
      setFileError('');
      const res = await productService.quickUpdateImage(imageEditingProduct.id, selectedFile);
      const updatedUrl = res.image_url || res.new_image_url;

      setProducts(prev =>
        prev.map(p => (p.id === imageEditingProduct.id ? { ...p, image_url: updatedUrl } : p))
      );
      setImageEditingProduct(null);
      setSelectedFile(null);
      setPreviewUrl('');
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Failed to upload photo. Please check file type and size.';
      setFileError(errMsg);
    } finally {
      setSavingImage(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await productService.createProduct({
        ...newProductForm,
        price_per_unit: parseFloat(newProductForm.price_per_unit),
        stock_quantity: parseFloat(newProductForm.stock_quantity)
      });
      setShowAddModal(false);
      setNewProductForm({
        name: '',
        price_per_unit: '',
        unit: 'kg',
        stock_quantity: '',
        description: '',
        image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80'
      });
      loadData();
    } catch (err) {
      alert('Failed to add product');
    }
  };

  const dismissAi = (prodId) => {
    setDismissedAiHints(prev => ({ ...prev, [prodId]: true }));
  };

  const applyAiPrice = async (prod) => {
    if (!prod.ai_suggested_price) return;
    try {
      await productService.quickUpdatePrice(prod.id, prod.ai_suggested_price);
      setProducts(prev =>
        prev.map(p => (p.id === prod.id ? { ...p, price_per_unit: prod.ai_suggested_price } : p))
      );
      dismissAi(prod.id);
    } catch (err) {
      alert('Failed to apply suggested price');
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="dashboard-sidebar">
        <div>
          <div className="sidebar-brand">
            <Package size={24} color="var(--color-primary)" />
            <span>Farm2Home</span>
          </div>

          <nav className="sidebar-nav">
            <div
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </div>
            <div
              className={`nav-item ${activeTab === 'products' ? 'active' : ''}`}
              onClick={() => setActiveTab('products')}
            >
              <Package size={18} />
              <span>{t('myProducts')}</span>
            </div>
            <div
              className="nav-item"
              onClick={() => setShowAddModal(true)}
            >
              <PlusCircle size={18} />
              <span>{t('addProduct')}</span>
            </div>
            <div
              className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('orders');
                openOrdersModal();
              }}
            >
              <ShoppingBag size={18} />
              <span>Orders</span>
            </div>
            <div
              className={`nav-item ${activeTab === 'earnings' ? 'active' : ''}`}
              onClick={() => setActiveTab('earnings')}
            >
              <Wallet size={18} />
              <span>{t('earnings')}</span>
            </div>
            <div
              className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <TrendingUp size={18} />
              <span>{t('analytics')}</span>
            </div>
            <div
              className={`nav-item ${activeTab === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai')}
            >
              <Bot size={18} />
              <span>{t('aiAssistant')}</span>
            </div>
          </nav>
        </div>

        {/* Pinned Settings and Logout */}
        <div style={{ borderTop: 'var(--border-hairline)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('settings');
              setShowSettingsModal(true);
            }}
            style={{ cursor: 'pointer' }}
          >
            <Settings size={18} />
            <span>Settings</span>
          </div>
          <div className="nav-item" onClick={logout} style={{ color: 'var(--color-danger)' }}>
            <LogOut size={18} />
            <span>Sign out</span>
          </div>
        </div>
      </aside>

      {/* Main Dashboard Area */}
      <main className="dashboard-main">
        {/* Top Bar */}
        <header className="top-bar">
          <div className="topbar-greeting">
            {t('welcomeBack')}, <span style={{ fontWeight: 600 }}>{user?.full_name || 'Farmer Ramesh'}</span>
          </div>

          <div className="topbar-actions" style={{ position: 'relative' }}>
            <LanguageToggle />
            <div
              className="icon-btn"
              onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
              style={{ cursor: 'pointer', position: 'relative' }}
              title="Notifications"
            >
              <Bell size={18} />
              <div className="badge-dot" />
            </div>

            {showNotificationsDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '46px',
                  right: '50px',
                  width: '320px',
                  backgroundColor: 'var(--color-bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-md)',
                  border: 'var(--border-hairline)',
                  zIndex: 100,
                  padding: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '8px', borderBottom: 'var(--border-hairline)' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Notifications</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', cursor: 'pointer' }} onClick={() => setShowNotificationsDropdown(false)}>Close</span>
                </div>
                {notifications.map(n => (
                  <div key={n.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.8125rem' }}>
                    <div style={{ fontWeight: 500, color: 'var(--color-text-main)' }}>{n.text}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{n.time}</div>
                  </div>
                ))}
              </div>
            )}

            <div
              className="avatar-circle"
              onClick={openProfileModal}
              style={{ cursor: 'pointer' }}
              title="Edit Profile"
            >
              {user?.full_name ? user.full_name.charAt(0) : 'R'}
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="dashboard-content">
          {/* EARNINGS VIEW */}
          {activeTab === 'earnings' && <EarningsView />}

          {/* ANALYTICS VIEW */}
          {activeTab === 'analytics' && <AnalyticsView />}

          {/* AI ASSISTANT VIEW */}
          {activeTab === 'ai' && (
            <AIAssistantView
              onQuickPrice={(p) => {
                setEditingProduct(p);
                setNewPrice(p.price_per_unit);
              }}
              onQuickStock={(p) => {
                setStockEditingProduct(p);
                setNewStock(p.stock_quantity);
              }}
              onViewOrders={openOrdersModal}
            />
          )}

          {/* DEFAULT DASHBOARD & PRODUCTS VIEW */}
          {(activeTab === 'dashboard' || activeTab === 'products' || activeTab === 'orders' || activeTab === 'settings') && (
            <>
              {/* STAT CARDS ROW: Exactly 3 Stat Cards */}
              <div className="stats-grid-3">
                <div
                  className="stat-card-clean"
                  onClick={() => setActiveTab('earnings')}
                  style={{ cursor: 'pointer' }}
                  title="View detailed earnings & payouts"
                >
                  <div className="stat-card-title">
                    <IndianRupee size={16} color="var(--color-success)" />
                    <span>{t('earningsThisMonth')}</span>
                  </div>
                  <div className="stat-card-value">₹{(stats?.monthly_earnings ?? 48250).toLocaleString()}</div>
                </div>

                <div
                  className="stat-card-clean"
                  onClick={openOrdersModal}
                  style={{ cursor: 'pointer' }}
                  title="View customer orders"
                >
                  <div className="stat-card-title">
                    <Clock size={16} color="var(--color-accent-customer)" />
                    <span>{t('activeOrders')}</span>
                  </div>
                  <div className="stat-card-value">{stats?.active_orders ?? 0}</div>
                </div>

                <div className="stat-card-clean">
                  <div className="stat-card-title">
                    <AlertTriangle size={16} color="var(--color-warning)" />
                    <span>{t('lowStockAlert')}</span>
                  </div>
                  <div className="stat-card-value" style={{ color: (stats?.low_stock_count ?? 0) > 0 ? 'var(--color-warning)' : 'inherit' }}>
                    {stats?.low_stock_count ?? 0} items
                  </div>
                </div>
              </div>

              {/* QUICK ACTIONS ROW: Always visible, 1-tap buttons */}
              <div className="quick-actions-bar">
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('quickActions')}:
                </span>
                <button
                  className="quick-action-btn"
                  onClick={() => setShowAddModal(true)}
                >
                  <PlusCircle size={16} color="var(--color-primary)" />
                  <span>{t('addProduct')}</span>
                </button>
                <button
                  className="quick-action-btn"
                  onClick={() => products.length > 0 && setEditingProduct(products[0])}
                >
                  <Edit2 size={16} color="var(--color-primary)" />
                  <span>{t('updatePrice')}</span>
                </button>
                <button
                  className="quick-action-btn"
                  onClick={() => products.length > 0 && setStockEditingProduct(products[0])}
                >
                  <RefreshCw size={16} color="var(--color-primary)" />
                  <span>{t('updateStock')}</span>
                </button>
                <button
                  className="quick-action-btn"
                  onClick={openOrdersModal}
                >
                  <ShoppingBag size={16} color="var(--color-primary)" />
                  <span>{t('viewOrders')}</span>
                </button>
              </div>

              {/* PRODUCT LIST WITH INLINE QUICK PRICE EDITING */}
              <div className="product-table-wrapper">
                <div className="table-header-row">
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{t('myProducts')}</h2>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={loadData}
                  >
                    <RefreshCw size={14} />
                    <span>Refresh</span>
                  </button>
                </div>

                <table className="table-clean">
                  <thead>
                    <tr>
                      <th>Product name</th>
                      <th>{t('stockStatus')}</th>
                      <th>{t('currentPrice')}</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((prod) => {
                      const isLow = prod.stock_quantity <= prod.low_stock_threshold;
                      const showAi = prod.ai_suggested_price && !dismissedAiHints[prod.id];

                      return (
                        <tr key={prod.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ position: 'relative', display: 'inline-block' }}>
                                <img
                                  src={getImageUrl(prod.image_url)}
                                  alt={prod.name}
                                  style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
                                />
                                <button
                                  onClick={() => {
                                    setImageEditingProduct(prod);
                                    setSelectedFile(null);
                                    setPreviewUrl('');
                                    setFileError('');
                                  }}
                                  style={{
                                    position: 'absolute',
                                    bottom: '-3px',
                                    right: '-3px',
                                    backgroundColor: 'var(--color-bg-surface)',
                                    border: '1px solid var(--color-primary-border)',
                                    borderRadius: '50%',
                                    width: '18px',
                                    height: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                                  }}
                                  title="Edit product photo"
                                >
                                  <Camera size={10} color="var(--color-primary)" />
                                </button>
                              </div>
                              <div>
                                <div style={{ fontWeight: 500, color: 'var(--color-text-main)' }}>{prod.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                  {prod.unit} · {prod.is_organic ? 'Organic Certified' : 'Fresh Harvest'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className={`badge ${isLow ? 'badge-warning' : 'badge-success'}`}>
                                {isLow ? `${t('lowStock')} (${prod.stock_quantity} ${prod.unit})` : `${t('inStock')} (${prod.stock_quantity} ${prod.unit})`}
                              </span>
                              <button
                                onClick={() => setStockEditingProduct(prod)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                                title="Quick edit stock"
                              >
                                <Edit2 size={13} />
                              </button>
                            </div>
                          </td>

                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                              <span style={{ fontWeight: 600, fontSize: '1rem' }}>
                                ₹{prod.price_per_unit} / {prod.unit}
                              </span>

                              {showAi && (
                                <span className="ai-hint-tag">
                                  <Sparkles size={12} />
                                  <span>{t('aiPriceHint', { price: prod.ai_suggested_price })}</span>
                                  <button
                                    onClick={() => applyAiPrice(prod)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', padding: '0 2px' }}
                                    title="Apply suggestion"
                                  >
                                    <Check size={12} />
                                  </button>
                                  <button
                                    onClick={() => dismissAi(prod.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0 2px' }}
                                    title="Dismiss"
                                  >
                                    <X size={12} />
                                  </button>
                                </span>
                              )}
                            </div>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setImageEditingProduct(prod);
                                  setSelectedFile(null);
                                  setPreviewUrl('');
                                  setFileError('');
                                }}
                                title="Edit product photo"
                              >
                                <Camera size={13} />
                                <span>Photo</span>
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setEditingProduct(prod);
                                  setNewPrice(prod.price_per_unit);
                                }}
                              >
                                <Edit2 size={13} />
                                <span>{t('editPrice')}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>

      {/* PROFILE EDITOR MODAL */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Edit Farmer Profile</h3>
              <button
                onClick={() => setShowProfileModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {profileStatus.error && (
              <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', color: '#b91c1c', fontSize: '0.875rem', marginBottom: '14px' }}>
                {profileStatus.error}
              </div>
            )}

            {profileStatus.success && (
              <div style={{ padding: '8px 12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-sm)', color: '#15803d', fontSize: '0.875rem', marginBottom: '14px' }}>
                {profileStatus.success}
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
                  placeholder="farmer@farm2home.in"
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
                <label className="form-label">Farm Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={profileForm.farm_name}
                  onChange={(e) => setProfileForm({ ...profileForm, farm_name: e.target.value })}
                  placeholder="e.g. Ramesh Organic Fields"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Farm Location / District</label>
                <input
                  type="text"
                  className="form-input"
                  value={profileForm.location}
                  onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                  placeholder="e.g. Thanjavur, Tamil Nadu"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowProfileModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-accent-farmer"
                  disabled={savingProfile}
                >
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
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Dashboard Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
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
                <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>Profile Information</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                  Update your farm details and contact information
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
                Edit Profile
              </button>
            </div>

            <div className="hairline-divider" />

            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              <div>Signed in as: <span style={{ fontWeight: 500, color: 'var(--color-text-main)' }}>{user?.full_name || 'Farmer'}</span> ({user?.email || user?.phone || 'No contact email'})</div>
              <div style={{ marginTop: '4px' }}>Account Role: <span className="badge badge-success" style={{ marginLeft: '4px' }}>Farmer</span></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowSettingsModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORDERS MODAL */}
      {showOrdersModal && (
        <div className="modal-overlay" onClick={() => setShowOrdersModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={20} color="var(--color-primary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Customer Orders</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={openOrdersModal}
                  disabled={loadingOrders}
                  title="Refresh orders"
                >
                  <RefreshCw size={13} />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={() => setShowOrdersModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {loadingOrders ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Loading orders...
              </div>
            ) : orders.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No orders placed yet.
              </div>
            ) : (
              <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table className="table-clean" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Customer & Address</th>
                      <th>Delivery Partner</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((ord) => (
                      <tr key={ord.id}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{ord.order_number}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{ord.created_at}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{ord.customer_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{ord.delivery_address || 'Customer Delivery Address'}</div>
                          {ord.items_summary && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '2px', fontWeight: 500 }}>
                              🌾 {ord.items_summary}
                            </div>
                          )}
                        </td>
                        <td>
                          {ord.delivery_agent ? (
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--color-accent-delivery, #0284c7)' }}>
                                🛵 {ord.delivery_agent.name}
                              </div>
                              {ord.delivery_agent.phone && (
                                <a
                                  href={`tel:${ord.delivery_agent.phone}`}
                                  style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textDecoration: 'none', display: 'block', marginTop: '2px' }}
                                >
                                  📞 {ord.delivery_agent.phone}
                                </a>
                              )}
                              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                                Leg: {ord.delivery_status || 'Assigned'}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#ea580c', backgroundColor: '#fff7ed', padding: '3px 8px', borderRadius: '4px', border: '1px solid #ffedd5', display: 'inline-block' }}>
                              ⏳ Finding a delivery partner…
                            </span>
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>₹{ord.total_amount}</td>
                        <td>
                          <span className={`badge ${
                            ord.status === 'delivered' ? 'badge-success' :
                            ord.status === 'processing' ? 'badge-primary' :
                            'badge-warning'
                          }`}>
                            {ord.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {ord.status === 'pending' && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={async () => {
                                try {
                                  await productService.updateFarmerOrderStatus(ord.id, 'processing');
                                  setOrders(prev => prev.map(o => o.id === ord.id ? { ...o, status: 'processing' } : o));
                                } catch (e) {
                                  console.error('Failed to update order status', e);
                                }
                              }}
                            >
                              Accept Order
                            </button>
                          )}
                          {ord.status === 'processing' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                              onClick={async () => {
                                try {
                                  await productService.updateFarmerOrderStatus(ord.id, 'delivered');
                                  setOrders(prev => prev.map(o => o.id === ord.id ? { ...o, status: 'delivered' } : o));
                                } catch (e) {
                                  console.error('Failed to update order status', e);
                                }
                              }}
                            >
                              Mark Delivered
                            </button>
                          )}
                          {ord.status === 'delivered' && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Completed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowOrdersModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MINIMAL PRICE-ONLY MODAL (Never the full product edit form) */}
      {editingProduct && (
        <div className="modal-overlay" onClick={() => setEditingProduct(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Quick price update</h3>
              <button
                onClick={() => setEditingProduct(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Updating rate for <b>{editingProduct.name}</b> (per {editingProduct.unit})
            </p>

            <form onSubmit={handleSavePrice}>
              <div className="form-group">
                <label className="form-label">New price per {editingProduct.unit} (₹)</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-input"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  autoFocus
                  required
                  style={{ fontSize: '1.25rem', fontWeight: 600 }}
                />
              </div>

              {editingProduct.ai_suggested_price && (
                <div style={{ padding: '10px', backgroundColor: '#eff6ff', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', color: '#1e40af', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>AI estimated market rate: ₹{editingProduct.ai_suggested_price}</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => setNewPrice(editingProduct.ai_suggested_price)}
                  >
                    Use suggestion
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingProduct(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingPrice}
                >
                  {savingPrice ? 'Saving...' : 'Save price'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK STOCK EDIT MODAL */}
      {stockEditingProduct && (
        <div className="modal-overlay" onClick={() => setStockEditingProduct(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Update inventory stock</h3>
              <button
                onClick={() => setStockEditingProduct(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Updating harvest stock for <b>{stockEditingProduct.name}</b>
            </p>

            <form onSubmit={handleSaveStock}>
              <div className="form-group">
                <label className="form-label">Available quantity ({stockEditingProduct.unit})</label>
                <input
                  type="number"
                  step="1"
                  className="form-input"
                  value={newStock}
                  placeholder={stockEditingProduct.stock_quantity.toString()}
                  onChange={(e) => setNewStock(e.target.value)}
                  autoFocus
                  required
                  style={{ fontSize: '1.25rem', fontWeight: 600 }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStockEditingProduct(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Update stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK IMAGE EDIT MODAL */}
      {imageEditingProduct && (
        <div className="modal-overlay" onClick={() => {
          setImageEditingProduct(null);
          setSelectedFile(null);
          setPreviewUrl('');
          setFileError('');
        }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Update product photo</h3>
              <button
                onClick={() => {
                  setImageEditingProduct(null);
                  setSelectedFile(null);
                  setPreviewUrl('');
                  setFileError('');
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Select a photo from your device gallery or camera for <b>{imageEditingProduct.name}</b>
            </p>

            {fileError && (
              <div style={{
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fca5a5',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertTriangle size={16} />
                <span>{fileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveImage}>
              {/* Image Preview Box */}
              <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                  {selectedFile ? 'Selected Photo Preview' : 'Current Photo'}
                </div>
                <img
                  src={previewUrl || getImageUrl(imageEditingProduct.image_url)}
                  alt="Preview"
                  onError={(e) => {
                    e.target.src = DEFAULT_PRODUCT_IMAGE;
                  }}
                  style={{ width: '140px', height: '140px', borderRadius: 'var(--radius-md)', objectFit: 'cover', border: 'var(--border-hairline)' }}
                />
              </div>

              {/* Direct File Input with Camera Capture attribute */}
              <div className="form-group">
                <label className="form-label">Choose photo from device or camera</label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  capture="environment"
                  className="form-input"
                  onChange={handleFileSelect}
                  style={{ padding: '8px' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                  Supported formats: JPG, PNG, WebP (Max size: 5MB)
                </span>
              </div>

              {selectedFile && (
                <div style={{ fontSize: '0.8125rem', color: '#16a34a', fontWeight: 500, marginBottom: '12px' }}>
                  ✓ Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setImageEditingProduct(null);
                    setSelectedFile(null);
                    setPreviewUrl('');
                    setFileError('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!selectedFile || savingImage}
                >
                  {savingImage ? 'Uploading photo...' : 'Save photo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD PRODUCT MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Add new produce harvest</h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddProduct}>
              <div className="form-group">
                <label className="form-label">Produce Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newProductForm.name}
                  onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                  placeholder="e.g. Country Carrots (நாட்டு கேரட்)"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Price (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-input"
                    value={newProductForm.price_per_unit}
                    onChange={(e) => setNewProductForm({ ...newProductForm, price_per_unit: e.target.value })}
                    placeholder="45"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select
                    className="form-input"
                    value={newProductForm.unit}
                    onChange={(e) => setNewProductForm({ ...newProductForm, unit: e.target.value })}
                  >
                    <option value="kg">per kg</option>
                    <option value="bunch">per bunch</option>
                    <option value="piece">per piece</option>
                    <option value="liter">per liter</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Available Harvest Quantity</label>
                <input
                  type="number"
                  step="1"
                  className="form-input"
                  value={newProductForm.stock_quantity}
                  onChange={(e) => setNewProductForm({ ...newProductForm, stock_quantity: e.target.value })}
                  placeholder="50"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description / Harvest Notes</label>
                <input
                  type="text"
                  className="form-input"
                  value={newProductForm.description}
                  onChange={(e) => setNewProductForm({ ...newProductForm, description: e.target.value })}
                  placeholder="Harvested fresh today from organic soil"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-accent-farmer"
                >
                  Publish Produce
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
