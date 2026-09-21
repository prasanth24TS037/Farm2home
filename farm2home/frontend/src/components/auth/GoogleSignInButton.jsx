/**
 * GoogleSignInButton — Official-style Google sign-in button.
 *
 * Strategy: Two separate sub-components so `useGoogleLogin` (the real hook)
 * is ONLY mounted when VITE_GOOGLE_CLIENT_ID is a real value. This prevents
 * the hook from calling `onError` on mount when the provider has an invalid/
 * placeholder client ID.
 */
import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

// Official Google G logo (multi-color)
const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const Spinner = () => (
  <div
    className="auth-spinner"
    style={{ borderTopColor: '#4285F4', borderColor: 'rgba(66,133,244,0.2)', width: 18, height: 18 }}
  />
);

// ── Real Google button (hook only lives here, only mounted when client ID is real) ──
const RealGoogleButton = ({ role, onSuccess, onError, loading: parentLoading, t }) => {
  const [spinning, setSpinning] = useState(false);

  const googleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      onSuccess({ credential: tokenResponse.access_token });
      setSpinning(false);
    },
    onError: () => {
      onError(t('authErrorGeneric'));
      setSpinning(false);
    },
    flow: 'implicit',
  });

  const handleClick = () => {
    setSpinning(true);
    googleLogin();
  };

  return (
    <button
      type="button"
      id={`google-signin-${role}`}
      className="auth-google-btn"
      onClick={handleClick}
      disabled={parentLoading || spinning}
    >
      {spinning ? <Spinner /> : <GoogleLogo />}
      <span>{t('continueWithGoogle')}</span>
    </button>
  );
};

// ── Dev mock button (no hook, no network call) ──
const MockGoogleButton = ({ role, onSuccess, onError, loading: parentLoading, t }) => {
  const [spinning, setSpinning] = useState(false);

  const MOCK_TOKENS = {
    farmer: 'mock_farmer_google_token',
    customer: 'mock_customer_google_token',
    delivery: 'mock_delivery_google_token',
  };

  const handleClick = async () => {
    setSpinning(true);
    try {
      await onSuccess({ credential: MOCK_TOKENS[role] || 'mock_google_token' });
    } catch (_) {
      // error is handled by parent's onSuccess path
    } finally {
      setSpinning(false);
    }
  };

  return (
    <button
      type="button"
      id={`google-signin-mock-${role}`}
      className="auth-google-btn"
      onClick={handleClick}
      disabled={parentLoading || spinning}
      title="Mock Google login — only visible in DEV mode. Set VITE_GOOGLE_CLIENT_ID to use real Google."
    >
      {spinning ? <Spinner /> : <GoogleLogo />}
      <span>{t('continueWithGoogle')} <span style={{ fontSize: '0.75em', opacity: 0.65 }}>(dev mock)</span></span>
    </button>
  );
};

// ── Public export — decides which component to render ──
const PLACEHOLDER = 'your-google-client-id-here.apps.googleusercontent.com';

export const GoogleSignInButton = (props) => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isReal = !!(clientId && clientId !== PLACEHOLDER && clientId.length > 20);

  if (isReal) {
    return <RealGoogleButton {...props} />;
  }

  // In production without a real client ID, render nothing — Google sign-in is
  // simply not available. In DEV, render the mock button for testing.
  if (import.meta.env.DEV) {
    return <MockGoogleButton {...props} />;
  }

  return null;
};
