import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ProtectedRoute } from './routes/ProtectedRoute';

import { RoleSelection } from './pages/RoleSelection';
import { FarmerLogin } from './pages/FarmerLogin';
import { CustomerLogin } from './pages/CustomerLogin';
import { DeliveryLogin } from './pages/DeliveryLogin';
import { AdminLogin } from './pages/AdminLogin';

import { FarmerDashboard } from './pages/FarmerDashboard';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { DeliveryDashboard } from './pages/DeliveryDashboard';
import { AdminDashboard } from './pages/AdminDashboard';

import './styles/global.css';
import './styles/dashboards.css';

export function App() {
  return (
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

              {/* Role Protected Dashboards */}
              <Route element={<ProtectedRoute allowedRoles={['farmer', 'admin']} />}>
                <Route path="/dashboard/farmer" element={<FarmerDashboard />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['customer', 'admin']} />}>
                <Route path="/dashboard/customer" element={<CustomerDashboard />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['delivery', 'admin']} />}>
                <Route path="/dashboard/delivery" element={<DeliveryDashboard />} />
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
  );
}

export default App;
