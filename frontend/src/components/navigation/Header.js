import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRefresh } from '../../contexts/RefreshContext';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, UserCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

const Header = () => {
  const { user, logout } = useAuth();
  const { triggerRefresh } = useRefresh();
  const navigate = useNavigate();
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  const [imgLoaded, setImgLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { setImgLoaded(false); }, [user?.photo_url]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await triggerRefresh();
    setRefreshing(false);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10" data-testid="header">
      <div className="flex items-center justify-between h-16 pl-14 pr-4 sm:pr-6 lg:pl-8 lg:pr-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-base sm:text-xl font-bold text-slate-900 truncate" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Fleet Management System
          </h2>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            data-testid="refresh-btn"
            title="Refresh page data"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>

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
            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
              {user?.photo_url ? (
                <>
                  {!imgLoaded && <div className="w-full h-full animate-pulse bg-slate-300" />}
                  <img
                    src={`${backendUrl}${user.photo_url}`}
                    alt=""
                    className={`w-full h-full object-cover ${imgLoaded ? '' : 'hidden'}`}
                    onLoad={() => setImgLoaded(true)}
                    onError={() => setImgLoaded(true)}
                  />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center"><UserCircle className="h-5 w-5 text-slate-400" /></div>
              )}
            </div>
            <span className="text-sm font-medium text-slate-700 hidden md:block">{user?.name}</span>
          </Link>

          <button
            onClick={logout}
            className="logout-btn"
            data-testid="logout-btn"
          >
            <div className="logout-btn-sign">
              <svg viewBox="0 0 512 512">
                <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"></path>
              </svg>
            </div>
            <div className="logout-btn-text">Logout</div>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
