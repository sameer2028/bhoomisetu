import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Landmark, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { role: 'DLAO', email: 'dlao@nla.gov.in', label: 'District LAO' },
    { role: 'PIA', email: 'pia@nla.gov.in', label: 'Project Agency' },
    { role: 'SGA', email: 'sga@nla.gov.in', label: 'Senior Authority' },
    { role: 'FRO', email: 'fro@nla.gov.in', label: 'Field Officer' },
  ];

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword('password123');
    setError('');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — Branding Panel */}
      <div className="hidden lg:flex lg:w-[55%] emblem-gradient relative overflow-hidden flex-col justify-between p-12">
        {/* Tricolor top stripe */}
        <div className="gov-stripe absolute top-0 left-0 right-0" />

        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/3 right-1/4 w-40 h-40 rounded-full bg-white/5" />

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
              <Landmark className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">National Land Acquisition</h1>
              <p className="text-blue-200 text-sm">&amp; Management System</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Digitizing India's<br />
            Land Acquisition<br />
            Lifecycle
          </h2>
          <p className="text-blue-200 text-lg max-w-lg leading-relaxed">
            One platform connecting projects, land parcels, documents, workflow, compensation, and rehabilitation — powered by GIS and AI.
          </p>

          <div className="flex gap-6 pt-4">
            {[
              { value: '12+', label: 'Workflow Stages' },
              { value: 'GIS', label: 'Spatial Mapping' },
              { value: 'AI', label: 'Mismatch Detection' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-blue-300 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-blue-300 text-xs">Smart India Hackathon 2026 — Prototype</p>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-neutral-50">
        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 rounded-xl emblem-gradient flex items-center justify-center mx-auto mb-3">
              <Landmark className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900">NLA System</h1>
            <p className="text-neutral-500 text-sm">SIH 2026</p>
          </div>

          <div className="card p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-neutral-900">Sign in to your account</h2>
              <p className="text-sm text-neutral-500 mt-1">Enter your credentials to access the system</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="form-label">Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@nla.gov.in"
                  className="form-input"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className="form-label">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="form-input pr-10"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-3"
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Demo Accounts */}
            <div className="mt-6 pt-6 border-t border-neutral-100">
              <p className="text-xs text-neutral-400 uppercase tracking-wider font-medium mb-3">Demo Accounts</p>
              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.role}
                    onClick={() => fillDemo(acc)}
                    className="px-3 py-2 text-xs font-medium text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors text-left"
                  >
                    <span className="block font-semibold">{acc.label}</span>
                    <span className="text-neutral-400 text-[10px]">{acc.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-neutral-400 mt-6">
            National Land Acquisition & Management System — SIH 2026 Prototype
          </p>
        </div>
      </div>
    </div>
  );
}
