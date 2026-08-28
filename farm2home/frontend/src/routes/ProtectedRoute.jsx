import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role) && user?.role !== 'admin') {
    // If not authorized for this specific role dashboard, redirect to role's proper home
    if (user?.role === 'farmer') return <Navigate to="/dashboard/farmer" replace />;
    if (user?.role === 'customer') return <Navigate to="/dashboard/customer" replace />;
    if (user?.role === 'delivery') return <Navigate to="/dashboard/delivery" replace />;
    if (user?.role === 'admin') return <Navigate to="/dashboard/admin" replace />;
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
