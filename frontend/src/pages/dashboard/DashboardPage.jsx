import { useAuth } from '../../contexts/AuthContext';
import {
  FolderKanban,
  MapPin,
  GitBranch,
  FileText,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, roleLabel } = useAuth();

  // Placeholder KPI data — will be replaced with real data in Phase 11
  const kpis = [
    { label: 'Total Projects', value: '—', icon: FolderKanban, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-100' },
    { label: 'Total Parcels', value: '—', icon: MapPin, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
    { label: 'Active Cases', value: '—', icon: GitBranch, color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-100' },
    { label: 'Documents', value: '—', icon: FileText, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' },
    { label: 'Overdue Cases', value: '—', icon: Clock, color: 'text-rose-700', bg: 'bg-rose-50 border-rose-100' },
    { label: 'Completed', value: '—', icon: CheckCircle2, color: 'text-teal-700', bg: 'bg-teal-50 border-teal-100' },
    { label: 'High Risk', value: '—', icon: AlertTriangle, color: 'text-orange-700', bg: 'bg-orange-50 border-orange-100' },
    { label: 'Progress', value: '—', icon: TrendingUp, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-100' },
  ];

  const currentDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 md:p-8 text-white shadow-lg border border-slate-700/50">
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-blue-500/20 blur-2xl" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-indigo-500/20 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-blue-200 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>National Portal Active • Jurisdiction: {user?.district || 'All Districts'}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Welcome back, {user?.full_name || 'Officer'}
            </h1>
            <p className="text-blue-100 text-sm mt-1 flex items-center gap-2">
              <span>{roleLabel} ({user?.role})</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-blue-200/80">
                <Calendar className="w-3.5 h-3.5" /> {currentDate}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
              <span className="text-[10px] text-blue-200 uppercase tracking-wider block font-medium">System Status</span>
              <span className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Operational
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Executive Overview</h2>
          <span className="text-xs text-slate-400 font-medium">Real-time metrics</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="kpi-card group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{kpi.label}</span>
                  <div className={`w-9 h-9 rounded-lg ${kpi.bg} border flex items-center justify-center transition-transform group-hover:scale-105`}>
                    <Icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{kpi.value}</div>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">Data will populate in Phase 11</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Banner */}
      <div className="card p-6 bg-white border-l-4 border-l-blue-700">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 text-blue-700 shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Platform Architecture &amp; Lifecycle Status</h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
              The application core infrastructure is active with authenticated RBAC roles, live PostGIS spatial cadastral layers,
              dynamic 11-stage statutory acquisition case tracking, and comprehensive land records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

