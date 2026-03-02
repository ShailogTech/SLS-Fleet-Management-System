import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/navigation/Sidebar';
import Header from '../components/navigation/Header';

const DashboardLayout = () => {
  const location = useLocation();

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-transparent" data-testid="dashboard-layout">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="page-transition" key={location.pathname}>
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
