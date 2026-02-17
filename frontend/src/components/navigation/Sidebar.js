import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Truck,
  Users,
  FileText,
  CheckSquare,
  AlertTriangle,
  BarChart3,
  Settings,
  Menu,
  X,
  UserPlus,
  MapPin,
  ClipboardList,
  UserCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['superuser', 'admin', 'maker', 'checker', 'approver', 'office_incharge', 'records_incharge', 'plant_incharge', 'viewer'] },
    { name: 'My Profile', href: '/profile', icon: UserCircle, roles: ['superuser', 'admin', 'maker', 'checker', 'approver', 'office_incharge', 'records_incharge', 'plant_incharge', 'viewer', 'driver'] },
    { name: 'Vehicles', href: '/vehicles', icon: Truck, roles: ['superuser', 'admin', 'maker', 'checker', 'approver', 'office_incharge', 'records_incharge', 'plant_incharge', 'viewer'] },
    { name: 'Drivers', href: '/drivers', icon: Users, roles: ['superuser', 'admin', 'maker', 'checker', 'approver', 'office_incharge', 'records_incharge', 'plant_incharge', 'viewer'] },
    { name: 'Plants', href: '/plants', icon: MapPin, roles: ['superuser', 'admin', 'office_incharge', 'viewer'] },
    { name: 'Stoppages', href: '/stoppages', icon: AlertTriangle, roles: ['superuser', 'admin', 'office_incharge', 'plant_incharge'] },
    { name: 'Tenders', href: '/tenders', icon: FileText, roles: ['superuser', 'admin', 'maker', 'checker', 'approver', 'office_incharge', 'viewer'] },
    {
      name: 'Approvals',
      href: '/approvals',
      icon: CheckSquare,
      roles: ['checker', 'approver', 'admin', 'superuser']
    },
    {
      name: 'My Submissions',
      href: '/my-submissions',
      icon: ClipboardList,
      roles: ['maker', 'admin', 'superuser', 'office_incharge', 'records_incharge']
    },
    { name: 'Alerts', href: '/alerts', icon: AlertTriangle, roles: ['superuser', 'admin', 'records_incharge', 'office_incharge'] },
    { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['superuser', 'admin', 'office_incharge'] },
    {
      name: 'Signup Requests',
      href: '/signup-requests',
      icon: UserPlus,
      roles: ['admin', 'superuser', 'approver']
    },
    {
      name: 'Users',
      href: '/users',
      icon: Settings,
      roles: ['admin', 'superuser']
    },
  ];

  const filteredNavigation = navigation.filter(item =>
    item.roles.includes(user?.role)
  );

  const NavItem = ({ item }) => {
    const isActive = location.pathname === item.href;

    return (
      <Link
        to={item.href}
        data-testid={`nav-link-${item.name.toLowerCase().replace(/ /g, '-')}`}
        className={cn(
          'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
          isActive
            ? 'bg-slate-900 text-white'
            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
        )}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <item.icon className="mr-3 h-5 w-5" />
        {item.name}
      </Link>
    );
  };

  return (
    <>
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-slate-900 text-white"
        data-testid="mobile-menu-toggle"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-gray-300 border-r border-slate-300 transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        data-testid="sidebar"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center h-16 px-4 border-b border-slate-200">
            <h1 className="text-2xl font-black text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
              SLS Fleet
            </h1>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <nav className="space-y-1">
              {filteredNavigation.map((item) => (
                <NavItem key={item.name} item={item} />
              ))}
            </nav>
          </div>

          <div className="p-4 border-t border-slate-200">
            <Link to="/profile" className="flex items-center space-x-3 hover:bg-slate-50 rounded-lg p-2 -m-2 transition-colors" data-testid="sidebar-profile-link">
              <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                {user?.photo_url ? (
                  <img src={`${process.env.REACT_APP_BACKEND_URL}${user.photo_url}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><UserCircle className="h-5 w-5 text-slate-400" /></div>
                )}
              </div>
              <div className="text-xs text-slate-500 min-w-0">
                <div className="font-semibold text-slate-900 truncate">{user?.name}</div>
                <div className="truncate">{user?.email}</div>
                <div className="mt-0.5 capitalize">{user?.role?.replace('_', ' ')}</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
