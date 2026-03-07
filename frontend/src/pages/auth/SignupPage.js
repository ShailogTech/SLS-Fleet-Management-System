import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Truck, User, Mail, Phone, Lock, CheckCircle, AlertCircle } from 'lucide-react';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        if (value && /[^a-zA-Z\s]/.test(value)) return 'Name should only contain letters and spaces. No numbers or special characters allowed.';
        if (value && value.trim().length < 2) return 'Name must be at least 2 characters.';
        return '';
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address (e.g. name@company.com).';
        return '';
      case 'phone':
        if (value && /[a-zA-Z]/.test(value)) return 'Phone number should not contain letters. Only numbers are allowed.';
        if (value && /[^0-9+\-() ]/.test(value)) return 'Phone number contains invalid characters. Only digits, +, -, () are allowed.';
        if (value && value.replace(/[^0-9]/g, '').length < 10) return 'Phone number must be at least 10 digits.';
        return '';
      case 'password':
        if (value && value.length < 6) return 'Password must be at least 6 characters.';
        if (value && value.length > 20) return 'Password must not exceed 20 characters.';
        return '';
      case 'confirmPassword':
        if (value && value !== formData.password) return 'Passwords do not match.';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all fields before submitting
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match.' }));
      return;
    }

    if (formData.password.length < 6 || formData.password.length > 20) {
      setErrors(prev => ({ ...prev, password: 'Password must be between 6 and 20 characters.' }));
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/signup-request', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password
      });

      setSubmitted(true);
      toast.success('Registration request submitted successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
            <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Registration Submitted
            </h2>
            <p className="text-slate-600 mb-6">
              Your registration request has been submitted successfully.
              An administrator will review your request and assign you a role.
              You will be notified once your account is activated.
            </p>
            <Button
              onClick={() => navigate('/login')}
              className="bg-slate-900 hover:bg-slate-800"
              data-testid="back-to-login-btn"
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" data-testid="signup-page">
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="https://assets.mixkit.co/videos/28787/28787-720.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-slate-900 bg-opacity-60"></div>
        <div className="relative z-10 flex flex-col justify-center h-full px-12 text-white">
          <div className="flex items-center mb-6">
            <div className="bg-white p-3 rounded-lg">
              <Truck className="h-10 w-10 text-slate-900" />
            </div>
          </div>
          <h1 className="text-5xl font-black mb-4" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Join Our Fleet
          </h1>
          <p className="text-xl text-slate-200" style={{ fontFamily: 'Inter, sans-serif' }}>
            Create an account to get started with SLTS Fleet Management
          </p>
          <div className="mt-8 space-y-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <span>Fleet tracking and management</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <span>Document expiry alerts</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <span>Real-time notifications</span>
            </div>
          </div>
        </div>
      </div>

      <div
        className="flex-1 flex items-center justify-center p-8"
        style={{
          backgroundColor: '#f8fafc',
          backgroundImage: 'linear-gradient(rgba(148,163,184,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.2) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      >
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
            <div className="text-center mb-8">
              <div className="lg:hidden flex justify-center mb-4">
                <div className="bg-slate-900 p-3 rounded-lg">
                  <Truck className="h-8 w-8 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
                Create Account
              </h2>
              <p className="text-slate-600 mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                Fill in your details to get started
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="name"
                    name="signup-fullname"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange({ target: { name: 'name', value: e.target.value } })}
                    required
                    placeholder="Enter your full name"
                    autoComplete="new-password"
                    className={`pl-10 ${errors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
                    data-testid="signup-name-input"
                  />
                </div>
                {errors.name && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-red-600 text-xs" style={{ animation: 'shake 0.4s ease-in-out' }}>
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{errors.name}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    name="signup-email-field"
                    type="text"
                    inputMode="email"
                    value={formData.email}
                    onChange={(e) => handleChange({ target: { name: 'email', value: e.target.value } })}
                    required
                    placeholder="Enter your email"
                    autoComplete="new-password"
                    className={`pl-10 ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                    data-testid="signup-email-input"
                  />
                </div>
                {errors.email && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-red-600 text-xs" style={{ animation: 'shake 0.4s ease-in-out' }}>
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{errors.email}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="phone"
                    name="signup-phone-field"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange({ target: { name: 'phone', value: e.target.value.replace(/[^0-9]/g, '') } })}
                    required
                    placeholder="Enter your phone number"
                    autoComplete="new-password"
                    className={`pl-10 ${errors.phone ? 'border-red-500 focus:ring-red-500' : ''}`}
                    data-testid="signup-phone-input"
                  />
                </div>
                {errors.phone && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-red-600 text-xs" style={{ animation: 'shake 0.4s ease-in-out' }}>
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{errors.phone}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    name="signup-pass-field"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange({ target: { name: 'password', value: e.target.value } })}
                    required
                    placeholder="Create a password (6-20 chars)"
                    maxLength={20}
                    autoComplete="new-password"
                    className={`pl-10 ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                    data-testid="signup-password-input"
                  />
                </div>
                {errors.password && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-red-600 text-xs" style={{ animation: 'shake 0.4s ease-in-out' }}>
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{errors.password}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    name="signup-confirm-field"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange({ target: { name: 'confirmPassword', value: e.target.value } })}
                    required
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    className={`pl-10 ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''}`}
                    data-testid="signup-confirm-password-input"
                  />
                </div>
                {errors.confirmPassword && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-red-600 text-xs" style={{ animation: 'shake 0.4s ease-in-out' }}>
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{errors.confirmPassword}</span>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white h-11"
                disabled={loading}
                data-testid="signup-submit-btn"
              >
                {loading ? 'Submitting...' : 'Submit Registration'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-slate-900 hover:underline"
                  data-testid="login-link"
                >
                  Sign in here
                </Link>
              </p>
            </div>

            <div className="mt-4 p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-xs text-slate-500">
                After registration, an administrator will review your request and assign you a role.
                You will be notified once your account is activated.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
