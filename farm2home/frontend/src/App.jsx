import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { GoogleOAuthProvider } from '@react-oauth/google';

import { RoleSelection } from './pages/RoleSelection';
import { FarmerLogin } from './pages/FarmerLogin';
import { CustomerLogin } from './pages/CustomerLogin';
import { DeliveryLogin } from './pages/DeliveryLogin';
import { AdminLogin } from './pages/AdminLogin';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ProfileCompletionPage } from './pages/ProfileCompletionPage';

import { FarmerDashboard } from './pages/FarmerDashboard';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { PaymentPage } from './pages/PaymentPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { DeliveryLayout } from './pages/delivery/DeliveryLayout';
import { DeliveryHome } from './pages/delivery/DeliveryHome';
import { DeliveryRoute } from './pages/delivery/DeliveryRoute';
import { DeliveryHistory } from './pages/delivery/DeliveryHistory';
import { DeliveryProfile } from './pages/delivery/DeliveryProfile';
import { DeliveryEarnings } from './pages/delivery/DeliveryEarnings';
import { AdminDashboard } from './pages/AdminDashboard';

import './styles/global.css';
import './styles/dashboards.css';

// Google Client ID from env — set VITE_GOOGLE_CLIENT_ID in frontend/.env
// Never hardcode a real client ID here.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'placeholder-set-VITE_GOOGLE_CLIENT_ID-in-env';

export function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <LanguageProvider>
        <AuthProvider>
          <CartProvider>
            <Router>
              <Routes>
                {/* Public Role Landing Page */}
                <Route path="/" element={<RoleSelection />} />

                {/* Role Dedicated Authentication Pages */}
                <Route path="/login/farmer" element={<FarmerLogin />} />
                <Route path="/login/customer" element={<CustomerLogin />} />
                <Route path="/login/delivery" element={<DeliveryLogin />} />
                <Route path="/login/admin" element={<AdminLogin />} />

                {/* Forgot / Reset Password (public) */}
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

                {/* Profile completion (requires auth, shown after Google sign-in for new users) */}
                <Route element={<ProtectedRoute allowedRoles={['farmer', 'customer', 'delivery']} />}>
                  <Route path="/complete-profile" element={<ProfileCompletionPage />} />
                </Route>

                {/* Role Protected Dashboards */}
                <Route element={<ProtectedRoute allowedRoles={['farmer', 'admin']} />}>
                  <Route path="/dashboard/farmer" element={<FarmerDashboard />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['customer', 'admin']} />}>
                  <Route path="/dashboard/customer" element={<CustomerDashboard />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/payment" element={<PaymentPage />} />
                  <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['delivery', 'admin']} />}>
                  <Route path="/dashboard/delivery" element={<DeliveryLayout />}>
                    <Route index element={<Navigate to="home" replace />} />
                    <Route path="home" element={<DeliveryHome />} />
                    <Route path="route" element={<DeliveryRoute />} />
                    <Route path="history" element={<DeliveryHistory />} />
                    <Route path="profile" element={<DeliveryProfile />} />
                    <Route path="earnings" element={<DeliveryEarnings />} />
                  </Route>
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                  <Route path="/dashboard/admin" element={<AdminDashboard />} />
                </Route>

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </CartProvider>
        </AuthProvider>
      </LanguageProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
