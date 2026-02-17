import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Bell, UserCircle } from 'lucide-react';
import { Button } from '../ui/button';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10" data-testid="header">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Fleet Management System
          </h2>
        </div>

        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="relative"
            onClick={() => navigate('/alerts')}
            data-testid="notifications-btn"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
          </Button>

          <Link to="/profile" className="flex items-center space-x-2 hover:bg-slate-50 rounded-lg px-2 py-1 transition-colors" data-testid="header-profile-link">
            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
              {user?.photo_url ? (
                <img src={`${backendUrl}${user.photo_url}`} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><UserCircle className="h-5 w-5 text-slate-400" /></div>
              )}
            </div>
            <span className="text-sm font-medium text-slate-700 hidden md:block">{user?.name}</span>
          </Link>

          <Button
            onClick={logout}
            variant="ghost"
            size="sm"
            data-testid="logout-btn"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
