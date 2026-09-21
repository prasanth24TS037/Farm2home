import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sprout } from 'lucide-react';
import { LanguageToggle } from '../common/LanguageToggle';
import { useLanguage } from '../../context/LanguageContext';
import '../../styles/auth.css';

// Role-specific gradient backgrounds
const ROLE_GRADIENTS = {
  farmer: 'linear-gradient(135deg, #064e3b 0%, #065f46 35%, #047857 65%, #059669 100%)',
  customer: 'linear-gradient(135deg, #0c4a6e 0%, #075985 35%, #0284c7 65%, #0ea5e9 100%)',
  delivery: 'linear-gradient(135deg, #78350f 0%, #92400e 35%, #b45309 65%, #d97706 100%)',
};

// Leaf-like SVG pattern overlay per role
const ROLE_PATTERNS = {
  farmer: (
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', inset: 0, opacity: 0.06, pointerEvents: 'none' }}>
      <defs>
        <pattern id="fp" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M30 5 Q50 10 55 30 Q50 50 30 55 Q10 50 5 30 Q10 10 30 5Z" fill="white" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#fp)" />
    </svg>
  ),
  customer: (
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none' }}>
      <defs>
        <pattern id="cp" width="50" height="50" patternUnits="userSpaceOnUse">
          <circle cx="25" cy="25" r="18" fill="none" stroke="white" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#cp)" />
    </svg>
  ),
  delivery: (
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none' }}>
      <defs>
        <pattern id="dp" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M0 30 L60 30M30 0 L30 60" stroke="white" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dp)" />
    </svg>
  ),
};

const ROLE_ICONS = {
  farmer: '🌾',
  customer: '🛒',
  delivery: '🚚',
};

/**
 * AuthLayout — shared split-screen wrapper for all three login pages.
 *
 * Props:
 *  - role: 'farmer' | 'customer' | 'delivery'
 *  - headline: string
 *  - subline: string
 *  - trustItems: string[]
 *  - children: React node (form content for right panel)
 */
export const AuthLayout = ({ role, headline, subline, trustItems = [], children }) => {
  const { t } = useLanguage();
  const gradient = ROLE_GRADIENTS[role] || ROLE_GRADIENTS.farmer;
  const pattern = ROLE_PATTERNS[role];

  return (
    <div className="auth-split">
      {/* ── Left brand panel (desktop only) ───────────── */}
      <div className="auth-brand-panel" style={{ background: gradient }}>
        <div className="auth-brand-circle-sm" />
        {pattern}

        <div className="auth-brand-inner">
          {/* Logo */}
          <div className="auth-brand-logo">
            <div className="auth-brand-logo-icon">
              <Sprout size={22} color="#ffffff" />
            </div>
            <span>Farm2Home</span>
          </div>

          {/* Headline */}
          <div className="auth-brand-body">
            <div style={{ marginBottom: 16, fontSize: '2.5rem' }}>{ROLE_ICONS[role]}</div>
            <h2 className="auth-brand-headline">{headline}</h2>
            <p className="auth-brand-subline">{subline}</p>
          </div>

          {/* Trust indicators */}
          {trustItems.length > 0 && (
            <div className="auth-brand-trust">
              {trustItems.map((item, i) => (
                <div key={i} className="auth-trust-item">
                  <span className="auth-trust-dot" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right form panel ────────────────────────────── */}
      <div className="auth-form-panel">
        {/* Mobile top strip (hidden on desktop) */}
        <div className="auth-mobile-header">
          <Sprout size={20} color="var(--color-primary)" />
          <span>Farm2Home</span>
        </div>

        {/* Sticky top bar */}
        <div className="auth-form-topbar">
          <Link to="/" className="auth-back-link">
            <ArrowLeft size={16} />
            <span>{t('back') || 'Back'}</span>
          </Link>
          <LanguageToggle />
        </div>

        {/* Scrollable form area */}
        <div className="auth-form-scroll">
          <div className="auth-form-inner">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
