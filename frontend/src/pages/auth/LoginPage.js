import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { Truck, Lock, Mail, Eye, EyeOff, ArrowRight, Shield, MapPin, Clock } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleMouseMove = useCallback((e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      toast.success('Login successful!');
      if (result.user?.role === 'driver') {
        navigate('/driver-portal');
      } else {
        navigate('/');
      }
    } else {
      toast.error(result.error || 'Login failed');
    }

    setLoading(false);
  };

  return (
    <div
      className="login-page-root"
      onMouseMove={handleMouseMove}
      data-testid="login-page"
    >
      {/* Animated background */}
      <div className="login-bg">
        <div className="login-grid" />
        <div
          className="login-glow"
          style={{
            left: `${mousePos.x}px`,
            top: `${mousePos.y}px`,
          }}
        />
        {/* Floating route lines */}
        <svg className="login-routes" viewBox="0 0 1200 800" preserveAspectRatio="none">
          <path d="M0 400 Q300 200 600 350 T1200 300" className="login-route-path login-route-1" />
          <path d="M0 500 Q400 300 700 450 T1200 400" className="login-route-path login-route-2" />
          <path d="M0 600 Q350 400 650 500 T1200 500" className="login-route-path login-route-3" />
        </svg>
        {/* Floating dots (vehicles on map) */}
        <div className="login-dot login-dot-1" />
        <div className="login-dot login-dot-3" />
      </div>

      {/* Main content */}
      <div className={`login-container ${mounted ? 'login-mounted' : ''}`}>
        {/* Left panel — branding */}
        <div className="login-brand-panel">
          <div className="login-brand-inner">
            <div className="login-logo-row">
              <div className="login-logo-box">
                <Truck className="login-logo-icon" strokeWidth={2} />
              </div>
              <span className="login-logo-text">SLS Fleet</span>
            </div>

            <h1 className="login-headline">
              Smart Fleet<br />Management
            </h1>
            <p className="login-tagline">
              Track, manage and optimize your entire fleet operations from one powerful dashboard.
            </p>

            {/* Feature pills */}
            <div className="login-features">
              <div className="login-feature-pill">
                <MapPin size={14} />
                <span>Live Tracking</span>
              </div>
              <div className="login-feature-pill">
                <Shield size={14} />
                <span>Secure Access</span>
              </div>
              <div className="login-feature-pill">
                <Clock size={14} />
                <span>Real-time Alerts</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="login-stats">
              <div className="login-stat">
                <span className="login-stat-num">500+</span>
                <span className="login-stat-label">Vehicles</span>
              </div>
              <div className="login-stat-divider" />
              <div className="login-stat">
                <span className="login-stat-num">50+</span>
                <span className="login-stat-label">Plants</span>
              </div>
              <div className="login-stat-divider" />
              <div className="login-stat">
                <span className="login-stat-num">99.9%</span>
                <span className="login-stat-label">Uptime</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="login-form-panel">
          <div className="login-form-card">
            {/* Mobile logo */}
            <div className="login-mobile-logo">
              <div className="login-logo-box login-logo-box-sm">
                <Truck size={20} strokeWidth={2} />
              </div>
            </div>

            <div className="login-form-header">
              <h2 className="login-form-title">Welcome back</h2>
              <p className="login-form-subtitle">Enter your credentials to access the dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              {/* Email */}
              <div className={`login-field-group ${focusedField === 'email' ? 'login-field-focused' : ''} ${email ? 'login-field-filled' : ''}`}>
                <label className="login-label" htmlFor="email">Email Address</label>
                <div className="login-input-wrap">
                  <Mail className="login-input-icon" size={18} />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    required
                    placeholder="name@company.com"
                    className="login-input"
                    autoComplete="email"
                    data-testid="login-email-input"
                  />
                </div>
              </div>

              {/* Password */}
              <div className={`login-field-group ${focusedField === 'password' ? 'login-field-focused' : ''} ${password ? 'login-field-filled' : ''}`}>
                <label className="login-label" htmlFor="password">Password</label>
                <div className="login-input-wrap">
                  <Lock className="login-input-icon" size={18} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    required
                    placeholder="Enter your password"
                    className="login-input login-input-pw"
                    autoComplete="current-password"
                    data-testid="login-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="login-pw-toggle"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="login-submit-btn"
                data-testid="login-submit-btn"
              >
                <span className="login-submit-text">
                  {loading ? 'Signing in...' : 'Sign In'}
                </span>
                {!loading && <ArrowRight size={18} className="login-submit-arrow" />}
                {loading && <span className="login-spinner" />}
              </button>
            </form>

            <div className="login-footer">
              <p>
                Don't have an account?{' '}
                <Link to="/signup" className="login-signup-link" data-testid="signup-link">
                  Create account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
