import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import TruckLoader from './common/TruckLoader';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <TruckLoader fullScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
