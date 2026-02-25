import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { Truck, Lock, Mail, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
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
    setError('');
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
      setError(result.error || 'The email or password you entered is incorrect. Please try again.');
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
              <span className="login-logo-text">SLTS Fleet</span>
            </div>

            <h1 className="login-headline">
              Smart Fleet<br />Management
            </h1>

            {/* Truck Lottie animation */}
            <div className="login-truck-animation">
              <iframe
                src="https://lottie.host/embed/59477641-666d-4ae9-adab-8a19fdc291ef/ArasHyX9m9.lottie"
                style={{ width: '100%', height: '100%', border: 'none', background: 'transparent' }}
                title="Truck animation"
              />
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
              {/* Error Alert */}
              {error && (
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  marginBottom: '4px',
                  animation: 'shake 0.4s ease-in-out'
                }}>
                  <AlertCircle size={18} style={{ color: '#dc2626', flexShrink: 0, marginTop: '1px' }} />
                  <span style={{ color: '#dc2626', fontSize: '14px', lineHeight: '1.4' }}>{error}</span>
                </div>
              )}

              {/* Email */}
              <div className={`login-field-group ${focusedField === 'email' ? 'login-field-focused' : ''} ${email ? 'login-field-filled' : ''}`}>
                <label className="login-label" htmlFor="email">Email Address</label>
                <div className="login-input-wrap">
                  <Mail className="login-input-icon" size={18} />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
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
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
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
