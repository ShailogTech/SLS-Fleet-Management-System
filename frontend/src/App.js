import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RefreshProvider } from './contexts/RefreshContext';
import { Toaster } from './components/ui/sonner';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import Dashboard from './pages/dashboard/Dashboard';
import VehicleList from './pages/vehicles/VehicleList';
import VehicleForm from './pages/vehicles/VehicleForm';
import DriverList from './pages/drivers/DriverList';
import DriverForm from './pages/drivers/DriverForm';
import DriverPortal from './pages/drivers/DriverPortal';
import PlantInchargePortal from './pages/plants/PlantInchargePortal';
import ApprovalQueue from './pages/approvals/ApprovalQueue';
import MySubmissions from './pages/approvals/MySubmissions';
import PlantList from './pages/plants/PlantList';
import PlantForm from './pages/plants/PlantForm';
import StoppageList from './pages/stoppages/StoppageList';
import TenderManagement from './pages/tenders/TenderManagement';
import UserManagement from './pages/users/UserManagement';
import UserProfile from './pages/users/UserProfile';
import AlertCenter from './pages/alerts/AlertCenter';
import Reports from './pages/reports/Reports';
import SignupRequests from './pages/admin/SignupRequests';
import ExpiryCalendar from './pages/calendar/ExpiryCalendar';
import PersonalVehicleList from './pages/personal-vehicles/PersonalVehicleList';
import './App.css';

// Component to handle role-based default routing
const RoleBasedRedirect = () => {
  const { user } = useAuth();

  if (user?.role === 'driver') {
    return <Navigate to="/driver-portal" replace />;
  }
  if (user?.role === 'plant_incharge') {
    return <Navigate to="/plant-portal" replace />;
  }
  return <Dashboard />;
};

function App() {
  return (
    <AuthProvider>
      <RefreshProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Driver-specific portal (full page, no sidebar) */}
          <Route
            path="/driver-portal"
            element={
              <ProtectedRoute allowedRoles={['driver']}>
                <DriverPortal />
              </ProtectedRoute>
            }
          />

          {/* Plant Incharge portal (full page, no sidebar) */}
          <Route
            path="/plant-portal"
            element={
              <ProtectedRoute allowedRoles={['plant_incharge']}>
                <PlantInchargePortal />
              </ProtectedRoute>
            }
          />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<RoleBasedRedirect />} />
            <Route path="vehicles" element={<VehicleList />} />
            <Route path="vehicles/new" element={<VehicleForm />} />
            <Route path="drivers" element={<DriverList />} />
            <Route path="drivers/new" element={<DriverForm />} />
            <Route path="profile" element={<UserProfile />} />
            <Route path="plants" element={<PlantList />} />
            <Route path="plants/new" element={<PlantForm />} />
            <Route path="stoppages" element={<StoppageList />} />
            <Route path="tenders" element={<TenderManagement />} />
            <Route path="alerts" element={<AlertCenter />} />
            <Route
              path="expiry-calendar"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'approver']}>
                  <ExpiryCalendar />
                </ProtectedRoute>
              }
            />
            <Route path="reports" element={<Reports />} />
            <Route
              path="approvals"
              element={
                <ProtectedRoute allowedRoles={['checker', 'operational_manager', 'approver', 'admin', 'superadmin']}>
                  <ApprovalQueue />
                </ProtectedRoute>
              }
            />
            <Route
              path="my-submissions"
              element={
                <ProtectedRoute allowedRoles={['maker', 'admin', 'superadmin', 'office_incharge', 'records_incharge']}>
                  <MySubmissions />
                </ProtectedRoute>
              }
            />
            <Route
              path="personal-vehicles"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'maker', 'office_incharge']}>
                  <PersonalVehicleList />
                </ProtectedRoute>
              }
            />
            <Route
              path="users"
              element={
                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="signup-requests"
              element={
                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                  <SignupRequests />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        <Toaster position="top-right" />

      </BrowserRouter>
      </RefreshProvider>
    </AuthProvider>
  );
}

export default App;
