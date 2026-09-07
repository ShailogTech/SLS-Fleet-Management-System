import React, { useState, useEffect } from 'react';
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
  UserCircle,
  CalendarDays,
  Car
} from 'lucide-react';
import { cn } from '../../lib/utils';

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => { setImgLoaded(false); }, [user?.photo_url]);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['superadmin', 'admin', 'maker', 'checker', 'operational_manager', 'accounts_manager', 'approver', 'office_incharge', 'records_incharge', 'plant_incharge', 'viewer'] },
    { name: 'My Profile', href: '/profile', icon: UserCircle, roles: ['superadmin', 'admin', 'maker', 'checker', 'operational_manager', 'accounts_manager', 'approver', 'office_incharge', 'records_incharge', 'plant_incharge', 'viewer', 'driver'] },
    { name: 'Vehicles', href: '/vehicles', icon: Truck, roles: ['superadmin', 'admin', 'maker', 'checker', 'operational_manager', 'accounts_manager', 'approver', 'office_incharge', 'records_incharge', 'plant_incharge', 'viewer'] },
    { name: 'Drivers', href: '/drivers', icon: Users, roles: ['superadmin', 'admin', 'maker', 'checker', 'operational_manager', 'accounts_manager', 'approver', 'office_incharge', 'records_incharge', 'plant_incharge', 'viewer'] },
    { name: 'Plants', href: '/plants', icon: MapPin, roles: ['superadmin', 'admin', 'office_incharge', 'viewer'] },
    { name: 'Stoppages', href: '/stoppages', icon: AlertTriangle, roles: ['superadmin', 'admin', 'office_incharge', 'plant_incharge'] },
    { name: 'Tenders', href: '/tenders', icon: FileText, roles: ['superadmin', 'admin', 'maker', 'checker', 'operational_manager', 'accounts_manager', 'approver', 'office_incharge', 'viewer'] },
    {
      name: 'Approvals',
      href: '/approvals',
      icon: CheckSquare,
      roles: ['checker', 'operational_manager', 'approver', 'admin', 'superadmin']
    },
    {
      name: 'My Submissions',
      href: '/my-submissions',
      icon: ClipboardList,
      roles: ['maker', 'admin', 'superadmin', 'office_incharge', 'records_incharge']
    },
    { name: 'Alerts', href: '/alerts', icon: AlertTriangle, roles: ['superadmin', 'admin', 'records_incharge', 'office_incharge'] },
    { name: 'Expiry Calendar', href: '/expiry-calendar', icon: CalendarDays, roles: ['superadmin', 'admin', 'approver'] },
    { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['superadmin', 'admin', 'office_incharge'] },
    {
      name: 'Signup Requests',
      href: '/signup-requests',
      icon: UserPlus,
      roles: ['admin', 'superadmin']
    },
    {
      name: 'Personal Vehicles',
      href: '/personal-vehicles',
      icon: Car,
      roles: ['superadmin', 'admin', 'maker', 'office_incharge']
    },
    {
      name: 'Users',
      href: '/users',
      icon: Settings,
      roles: ['admin', 'superadmin']
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
          'flex items-center px-4 py-3 text-sm font-medium transition-colors',
          isActive
            ? 'bg-[#1a1a1a] text-white shadow-[inset_3px_0_0_#76b900]'
            : 'text-[#b3b3b3] hover:bg-[#1a1a1a] hover:text-white'
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
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#76b900] text-white"
        data-testid="mobile-menu-toggle"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-[#000000] border-r border-[#1a1a1a] transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        data-testid="sidebar"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center h-16 px-4 border-b border-[#1a1a1a] gap-2">
            <span className="h-6 w-[3px] bg-[#76b900]" aria-hidden />
            <h1 className="text-lg font-semibold tracking-[0.14em] text-white uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
              SLTS Fleet
            </h1>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <nav className="space-y-1">
              {filteredNavigation.map((item) => (
                <NavItem key={item.name} item={item} />
              ))}
            </nav>
          </div>

          <div className="p-4 border-t border-[#1a1a1a]">
            <Link to="/profile" className="flex items-center space-x-3 hover:bg-[#1a1a1a] p-2 -m-2 transition-colors" data-testid="sidebar-profile-link">
              <div className="w-9 h-9 rounded-full bg-[#1a1a1a] border border-[#333333] overflow-hidden flex-shrink-0">
                {user?.photo_url ? (
                  <>
                    {!imgLoaded && <div className="w-full h-full animate-pulse bg-[#333333]" />}
                    <img
                      src={`${process.env.REACT_APP_BACKEND_URL}${user.photo_url}`}
                      alt=""
                      className={`w-full h-full object-cover ${imgLoaded ? '' : 'hidden'}`}
                      onLoad={() => setImgLoaded(true)}
                      onError={() => setImgLoaded(true)}
                    />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><UserCircle className="h-5 w-5 text-[#8f8f8f]" /></div>
                )}
              </div>
              <div className="text-xs text-[#b3b3b3] min-w-0">
                <div className="font-semibold text-white truncate">{user?.name}</div>
                <div className="truncate">{user?.email}</div>
                <div className="mt-0.5 capitalize">{user?.role === 'superadmin' ? 'Admin' : user?.role?.replace(/_/g, ' ')}</div>
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
