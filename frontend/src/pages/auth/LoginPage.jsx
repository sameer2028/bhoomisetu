import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Landmark, Eye, EyeOff, AlertCircle, ShieldCheck, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';

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
    { role: 'DLAO', email: 'dlao@nla.gov.in', label: 'District LAO', badgeColor: 'bg-blue-50 text-blue-800 border-blue-200' },
    { role: 'PIA', email: 'pia@nla.gov.in', label: 'Project Agency', badgeColor: 'bg-purple-50 text-purple-800 border-purple-200' },
    { role: 'SGA', email: 'sga@nla.gov.in', label: 'Senior Authority', badgeColor: 'bg-amber-50 text-amber-800 border-amber-200' },
    { role: 'FRO', email: 'fro@nla.gov.in', label: 'Field Officer', badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  ];

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword('password123');
    setError('');
  };

  return (
    <div className="min-h-screen flex font-sans">
      {/* Left — Branding Panel */}
      <div className="hidden lg:flex lg:w-[52%] emblem-gradient relative overflow-hidden flex-col justify-between p-12 text-white">
        {/* Tricolor top stripe */}
        <div className="gov-stripe absolute top-0 left-0 right-0" />

        {/* Ambient background glows */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[32rem] h-[32rem] rounded-full bg-indigo-600/15 blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-cyan-400/10 blur-2xl" />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3.5 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
              <Landmark className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-white">NLA System</h1>
                <span className="text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded uppercase tracking-wider">
                  Official Portal
                </span>
              </div>
              <p className="text-blue-200 text-xs font-medium">Government of India • SIH 2026</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6 my-auto max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-blue-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Unified Land Acquisition &amp; Management Platform</span>
          </div>

          <h2 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
            Digitizing India's<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-sky-200 to-amber-200">
              Land Acquisition
            </span><br />
            Lifecycle
          </h2>

          <p className="text-blue-100/90 text-sm leading-relaxed">
            A state-of-the-art GIS and workflow platform connecting infrastructure projects, surveyed land parcels, compensation awards, R&amp;R, and AI mismatch detection.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-4">
            {[
              { value: '11 Stages', label: 'Statutory Pipeline', icon: ShieldCheck },
              { value: 'PostGIS', label: 'Cadastral GIS', icon: MapPin },
              { value: 'AI Verified', label: 'Discrepancy Engine', icon: CheckCircle2 },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="p-3.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-sm">
                  <Icon className="w-4 h-4 text-amber-300 mb-1.5" />
                  <div className="text-base font-bold text-white leading-tight">{stat.value}</div>
                  <div className="text-[11px] text-blue-200/80 mt-0.5">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-blue-200/70 border-t border-white/10 pt-4">
          <span>Smart India Hackathon 2026 Prototype</span>
          <span className="font-mono text-[11px]">v1.0.0-PROD</span>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-slate-50 relative">
        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 rounded-xl emblem-gradient flex items-center justify-center mx-auto mb-3 shadow-md">
              <Landmark className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">National Land Acquisition System</h1>
            <p className="text-slate-500 text-xs mt-0.5">Government of India • SIH 2026</p>
          </div>

          <div className="card p-8 bg-white border border-slate-200/80 shadow-card">
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Sign in to Portal</h2>
              <p className="text-xs text-slate-500 mt-1">Authorized personnel login for statutory land workflows</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="form-label">Government Email Address</label>
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
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="form-label mb-0">Password</label>
                </div>
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-3 text-sm font-semibold tracking-wide"
              >
                {loading ? (
                  <>
                    <span className="spinner !border-white/30 !border-t-white" />
                    Authenticating credentials...
                  </>
                ) : (
                  'Secure Sign In'
                )}
              </button>
            </form>

            {/* Quick Demo Accounts */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">Quick Demo Login</p>
                <span className="text-[10px] text-blue-600 font-medium">1-Click Fill</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => fillDemo(acc)}
                    className="p-2.5 text-xs text-left bg-slate-50 hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 rounded-lg transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-slate-800 group-hover:text-blue-900">{acc.label}</span>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded font-bold bg-white border border-slate-200 text-slate-600">
                        {acc.role}
                      </span>
                    </div>
                    <span className="text-slate-400 text-[10px] truncate block font-mono">{acc.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6 font-medium">
            National Land Acquisition &amp; Management Portal • SIH 2026
          </p>
        </div>
      </div>
    </div>
  );
}

