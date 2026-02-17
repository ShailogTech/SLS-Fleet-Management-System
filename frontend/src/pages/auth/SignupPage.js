import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Truck, User, Mail, Phone, Lock, CheckCircle } from 'lucide-react';

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
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
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
      <div
        className="hidden lg:block lg:w-1/2 relative bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1770715897376-22215c26e2a7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODF8MHwxfHNlYXJjaHw0fHxsb2dpc3RpY3MlMjB0cnVjayUyMGZsZWV0JTIwaW5kdXN0cmlhbHxlbnwwfHx8fDE3NzExNTM4MTN8MA&ixlib=rb-4.1.0&q=85)'
        }}
      >
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
            Create an account to get started with SLS Fleet Management
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

      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
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

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter your full name"
                    className="pl-10"
                    data-testid="signup-name-input"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter your email"
                    className="pl-10"
                    data-testid="signup-email-input"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="Enter your phone number"
                    className="pl-10"
                    data-testid="signup-phone-input"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Create a password"
                    className="pl-10"
                    data-testid="signup-password-input"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Confirm your password"
                    className="pl-10"
                    data-testid="signup-confirm-password-input"
                  />
                </div>
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
